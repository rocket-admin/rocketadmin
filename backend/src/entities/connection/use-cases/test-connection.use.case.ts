import { Inject, Injectable } from '@nestjs/common';
import { getRepository } from 'typeorm';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { processExceptionMessage } from '../../../exceptions/utils/process-exception-message.js';
import { isConnectionTypeAgent, slackPostMessage } from '../../../helpers/index.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { TestConnectionResultDs } from '../application/data-structures/test-connection-result.ds.js';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds.js';
import { ConnectionEntity } from '../connection.entity.js';
import { isHostAllowed } from '../utils/is-host-allowed.js';
import { ITestConnection } from './use-cases.interfaces.js';
import { processAWSConnection } from '../utils/process-aws-connection.util.js';
import { CreateConnectionDs } from '../application/data-structures/create-connection.ds.js';
import { ConnectionTypesEnum } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/enums/connection-types-enum.js';

@Injectable()
export class TestConnectionUseCase
  extends AbstractUseCase<UpdateConnectionDs, TestConnectionResultDs>
  implements ITestConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: UpdateConnectionDs): Promise<TestConnectionResultDs> {
    const checkingResult = await isHostAllowed(inputData.connection_parameters);
    if (!checkingResult) {
      return {
        result: false,
        message: Messages.CANNOT_CREATE_CONNECTION_TO_THIS_HOST,
      };
    }

    let {
      // eslint-disable-next-line prefer-const
      update_info: { connectionId, masterPwd },
      connection_parameters: connectionData,
    } = inputData;

    if (connectionId) {
      try {
        let toUpdate = await this._dbContext.connectionRepository.findOne({ where: { id: connectionId } });
        if (!toUpdate) {
          return {
            result: false,
            message: Messages.CONNECTION_NOT_FOUND,
          };
        }
        if (toUpdate?.masterEncryption && !masterPwd) {
          return {
            result: false,
            message: Messages.MASTER_PASSWORD_MISSING,
          };
        }
        if (isConnectionTypeAgent(toUpdate.type)) {
          const qb = await getRepository(ConnectionEntity)
            .createQueryBuilder('connection')
            .leftJoinAndSelect('connection.agent', 'agent')
            .where('connection.id = :id', { id: connectionId });
          toUpdate = await qb.getOne();
        }

        if (!toUpdate) {
          return {
            result: false,
            message: Messages.CONNECTION_NOT_FOUND,
          };
        }

        ['password', 'privateSSHKey', 'cert'].forEach((key) => {
          // eslint-disable-next-line security/detect-object-injection
          if (!connectionData[key]) {
            // eslint-disable-next-line security/detect-object-injection
            delete connectionData[key];
          }
        });

        if (toUpdate.masterEncryption && (!masterPwd || masterPwd.length <= 0)) {
          return {
            result: false,
            message: Messages.MASTER_PASSWORD_MISSING,
          };
        }

        if (toUpdate.masterEncryption) {
          toUpdate = Encryptor.decryptConnectionCredentials(toUpdate, masterPwd);
        }

        if (
          !connectionData.password &&
          (connectionData.host !== toUpdate.host || connectionData.port !== toUpdate.port) &&
          !isConnectionTypeAgent(connectionData.type)
        ) {
          return {
            result: false,
            message: Messages.PASSWORD_MISSING,
          };
        }

        let updated: any = Object.assign(toUpdate, connectionData);
        const dataForProcessing: CreateConnectionDs = {
          connection_parameters: updated,
          creation_info: null,
        };
        updated = (await processAWSConnection(dataForProcessing)).connection_parameters;
        const dao = getDataAccessObject(updated);

        return await this.testConnection(
          dao,
          updated,
          inputData.update_info.authorId,
          inputData.connection_parameters.type,
        );
      } catch (e) {
        return {
          result: false,
          message: `${Messages.CONNECTION_TEST_FILED}${e ? e : ''}`,
        };
      }
    } else {
      if (!connectionData.password) {
        return {
          result: false,
          message: Messages.PASSWORD_MISSING,
        };
      }

      const dataForProcessing: CreateConnectionDs = {
        connection_parameters: connectionData,
        creation_info: null,
      };
      connectionData = (await processAWSConnection(dataForProcessing)).connection_parameters;
      const dao = getDataAccessObject(connectionData as ConnectionEntity);

      return await this.testConnection(
        dao,
        connectionData,
        inputData.update_info.authorId,
        inputData.connection_parameters.type,
      );
    }
  }

  private async testConnection(
    dao: any,
    connectionData: any,
    authorId: string,
    connectionType: ConnectionTypesEnum,
  ): Promise<TestConnectionResultDs> {
    let testResult: TestConnectionResultDs;
    try {
      testResult = await dao.testConnect();
      return testResult;
    } catch (e) {
      let text: string = e.message.toLowerCase();

      if (text.includes('ssl required') || text.includes('ssl connection required')) {
        connectionData.ssl = true;
        const dao = getDataAccessObject(connectionData);
        try {
          testResult = await dao.testConnect();
          return testResult;
        } catch (e) {
          console.log('🚀 ~ e:', e);
          text = e.message;
        }
      }

      text = processExceptionMessage(text);
      return {
        result: false,
        message: text,
      };
    } finally {
      if (testResult?.result) {
        const foundUser = await this._dbContext.userRepository.findOneUserById(authorId);
        await slackPostMessage(Messages.USER_SUCCESSFULLY_TESTED_CONNECTION(foundUser?.email, connectionType));
      }
    }
  }
}
