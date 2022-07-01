import AbstractUseCase from '../../../common/abstract-use.case';
import { ITestConnection } from './use-cases.interfaces';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { TestConnectionResultDs } from '../application/data-structures/test-connection-result.ds';
import { Messages } from '../../../exceptions/text/messages';
import { isHostAllowed } from '../utils/is-host-allowed';
import { isConnectionTypeAgent } from '../../../helpers';
import { getRepository } from 'typeorm';
import { ConnectionEntity } from '../connection.entity';
import { Encryptor } from '../../../helpers/encryption/encryptor';
import { UpdateConnectionDs } from '../application/data-structures/update-connection.ds';
import { processExceptionMessage } from '../../../exceptions/utils/process-exception-message';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';

@Injectable({ scope: Scope.REQUEST })
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
    const {
      update_info: { connectionId, masterPwd, authorId },
      connection_parameters: connectionData,
    } = inputData;
    if (connectionId) {
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
      const updated = Object.assign(toUpdate, connectionData);
      const dao = createDataAccessObject(updated, authorId);

      try {
        return await dao.testConnect();
      } catch (e) {
        let text = e.message;
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
      const dao = createDataAccessObject(connectionData as ConnectionEntity, authorId);
      try {
        return await dao.testConnect();
      } catch (e) {
        let text = e.message;
        text = processExceptionMessage(text);
        return {
          result: false,
          message: text,
        };
      }
    }
  }
}
