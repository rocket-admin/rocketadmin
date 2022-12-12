import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { isConnectionEntityAgent } from '../../../helpers';
import { RestoredConnectionDs } from '../application/data-structures/restored-connection.ds';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds';
import { buildCreatedConnectionDs } from '../utils/build-created-connection.ds';
import { isHostAllowed } from '../utils/is-host-allowed';
import { isHostTest } from '../utils/is-test-connection-util';
import { updateConnectionEntityForRestoration } from '../utils/update-connection-entity-for-restoration';
import { IRestoreConnection } from './use-cases.interfaces';

@Injectable()
export class RestoreConnectionUseCase
  extends AbstractUseCase<UpdateConnectionDs, RestoredConnectionDs>
  implements IRestoreConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(connectionData: UpdateConnectionDs): Promise<RestoredConnectionDs> {
    const {
      connection_parameters,
      update_info: { connectionId },
    } = connectionData;
    const foundConnection = await this._dbContext.connectionRepository.findOneById(connectionId);
    if (!foundConnection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const hostCheckingResult = await isHostAllowed(connection_parameters);
    if (!hostCheckingResult) {
      throw new HttpException(
        {
          message: Messages.CANNOT_CREATE_CONNECTION_TO_THIS_HOST,
        },
        HttpStatus.FORBIDDEN,
      );
    }
    const isTestConnection = isHostTest(connectionData.connection_parameters.host);
    const updatedConnection = await updateConnectionEntityForRestoration(
      foundConnection,
      connectionData,
      isTestConnection,
    );
    if (isConnectionEntityAgent(updatedConnection)) {
      updatedConnection.agent = await this._dbContext.agentRepository.createNewAgentForConnection(updatedConnection);
    }
    let savedConnection = await this._dbContext.connectionRepository.saveNewConnection(updatedConnection);
    const token = updatedConnection.agent?.token || null;
    return {
      connection: buildCreatedConnectionDs(savedConnection, token, connectionData.update_info.masterPwd),
    };
  }
}
