import { Inject, Injectable } from '@nestjs/common';
import { getRepository } from 'typeorm';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { processExceptionMessage } from '../../../exceptions/utils/process-exception-message.js';
import { isConnectionTypeAgent } from '../../../helpers/index.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { TestConnectionResultDs } from '../application/data-structures/test-connection-result.ds.js';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds.js';
import { ConnectionEntity } from '../connection.entity.js';
import { isHostAllowed } from '../utils/is-host-allowed.js';
import { ITestConnection } from './use-cases.interfaces.js';
import { processAWSConnection } from '../utils/process-aws-connection.util.js';
import { CreateConnectionDs } from '../application/data-structures/create-connection.ds.js';

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
      update_info: { connectionId, masterPwd },
      connection_parameters: connectionData,
    } = inputData;
    if (connectionId) {
      ValidationHelper.validateOrThrowHttpExceptionUUID(connectionId);
      let toUpdate;
      try {
        toUpdate = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
        if (isConnectionTypeAgent(toUpdate.type)) {
          const qb = await getRepository(ConnectionEntity)
            .createQueryBuilder('connection')
            .leftJoinAndSelect('connection.agent', 'agent');
          qb.andWhere('connection.id = :id', { id: connectionId });
          toUpdate = await qb.getOne();
        }
        if (!toUpdate) {
          return {
            result: false,
            message: Messages.CONNECTION_NOT_FOUND,
          };
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

        if (!connectionData.password) {
          delete connectionData.password;
        }

        if (!connectionData.privateSSHKey) {
          delete connectionData.privateSSHKey;
        }

        if (!connectionData.cert) {
          delete connectionData.cert;
        }

        if (toUpdate.masterEncryption) {
          if (!masterPwd || masterPwd.length <= 0) {
            return {
              result: false,
              message: Messages.MASTER_PASSWORD_MISSING,
            };
          }
          toUpdate = Encryptor.decryptConnectionCredentials(toUpdate, masterPwd);
        }
      } catch (e) {
        return {
          result: false,
          message: `${Messages.CONNECTION_TEST_FILED}${e ? e : ''}`,
        };
      }
      let updated = Object.assign(toUpdate, connectionData);
      const dataForProcessing: CreateConnectionDs = {
        connection_parameters: updated,
        creation_info: null,
      };
      updated = (await processAWSConnection(dataForProcessing)).connection_parameters;
      const dao = getDataAccessObject(updated);

      try {
        return await dao.testConnect();
      } catch (e) {
        let text: string = e.message.toLowerCase();

        if (text.includes('ssl required') || text.includes('ssl connection required')) {
          updated.ssl = true;
          const dao = getDataAccessObject(updated);
          try {
            return await dao.testConnect();
          } catch (e) {
            text = e.message;
          }
        }
        text = processExceptionMessage(text);
        return {
          result: false,
          message: text,
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
      try {
        return await dao.testConnect();
      } catch (e) {
        let text: string = e.message.toLowerCase();
        if (text.includes('ssl required') || text.includes('ssl connection required')) {
          connectionData.ssl = true;
          const dao = getDataAccessObject(connectionData);
          try {
            return await dao.testConnect();
          } catch (e) {
            text = e.message;
          }
        }
        text = processExceptionMessage(text);
        return {
          result: false,
          message: text,
        };
      }
    }
  }
}
