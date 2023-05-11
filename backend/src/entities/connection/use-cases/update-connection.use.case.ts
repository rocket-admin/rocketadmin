import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AmplitudeEventTypeEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isConnectionTypeAgent } from '../../../helpers/index.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { AmplitudeService } from '../../amplitude/amplitude.service.js';
import { CreatedConnectionDs } from '../application/data-structures/created-connection.ds.js';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds.js';
import { ConnectionEntity } from '../connection.entity.js';
import { buildCreatedConnectionDs } from '../utils/build-created-connection.ds.js';
import { isTestConnectionUtil } from '../utils/is-test-connection-util.js';
import { validateCreateConnectionData } from '../utils/validate-create-connection-data.js';
import { IUpdateConnection } from './use-cases.interfaces.js';

@Injectable()
export class UpdateConnectionUseCase
  extends AbstractUseCase<UpdateConnectionDs, Omit<CreatedConnectionDs, 'groups'>>
  implements IUpdateConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
    private readonly amplitudeService: AmplitudeService,
  ) {
    super();
  }

  protected async implementation(
    updateConnectionData: UpdateConnectionDs,
  ): Promise<Omit<CreatedConnectionDs, 'groups'>> {
    const {
      connection_parameters,
      update_info: { masterPwd, connectionId, authorId },
    } = updateConnectionData;
    await validateCreateConnectionData(updateConnectionData);
    const foundConnectionToUpdate = await this._dbContext.connectionRepository.findAndDecryptConnection(
      connectionId,
      masterPwd,
    );
    const testConnectionsHosts = Constants.getTestConnectionsHostNamesArr();

    if (testConnectionsHosts.includes(foundConnectionToUpdate.host)) {
      throw new HttpException(
        {
          message: Messages.TEST_CONNECTIONS_UPDATE_NOT_ALLOWED,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    this.checkPasswordRequired(foundConnectionToUpdate, updateConnectionData.connection_parameters);
    const booleanKeys = Object.keys(connection_parameters).map((key: string) => {
      // eslint-disable-next-line security/detect-object-injection
      if (typeof connection_parameters[key] === 'boolean') {
        return key;
      }
    });
    for (const key of Object.keys(connection_parameters)) {
      // eslint-disable-next-line security/detect-object-injection
      if (!connection_parameters[key] && !booleanKeys.includes(key)) {
        // eslint-disable-next-line security/detect-object-injection
        delete connection_parameters[key];
      }
    }
    let updatedConnection: ConnectionEntity = Object.assign(foundConnectionToUpdate, connection_parameters);
    let connectionToken = null;
    if (isConnectionTypeAgent(updatedConnection.type)) {
      connectionToken = await this.renewOrCreateConnectionToken(updatedConnection.id);
    }
    if (updatedConnection.masterEncryption && masterPwd) {
      updatedConnection = Encryptor.encryptConnectionCredentials(updatedConnection, masterPwd);
    }
    const savedConnection = await this._dbContext.connectionRepository.saveNewConnection(updatedConnection);
    const isTest = isTestConnectionUtil(savedConnection);
    await this.amplitudeService.formAndSendLogRecord(
      isTest ? AmplitudeEventTypeEnum.connectionUpdatedTest : AmplitudeEventTypeEnum.connectionUpdated,
      authorId,
    );
    return buildCreatedConnectionDs(savedConnection, connectionToken, masterPwd);
  }

  private checkPasswordRequired(
    foundConnectionToUpdate: ConnectionEntity,
    newConnectionParameters: UpdateConnectionDs['connection_parameters'],
  ): void {
    if (
      newConnectionParameters.type &&
      !isConnectionTypeAgent(newConnectionParameters.type) &&
      !newConnectionParameters.password &&
      (newConnectionParameters.host !== foundConnectionToUpdate.host ||
        newConnectionParameters.port !== foundConnectionToUpdate.port)
    ) {
      throw new HttpException(
        {
          message: Messages.PASSWORD_MISSING,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async renewOrCreateConnectionToken(connectionId: string): Promise<string> {
    return await this._dbContext.agentRepository.renewOrCreateConnectionToken(connectionId);
  }
}
