import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common/exceptions/http.exception.js';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { AccessLevelEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { Encryptor } from '../../../helpers/encryption/encryptor.js';
import { FoundConnectionPropertiesDs } from '../../connection-properties/application/data-structures/found-connection-properties.ds.js';
import { buildFoundConnectionPropertiesDs } from '../../connection-properties/utils/build-found-connection-properties-ds.js';
import { FindOneConnectionDs } from '../application/data-structures/find-one-connection.ds.js';
import { IFindOneConnection } from './use-cases.interfaces.js';
import { FoundOneConnectionDs } from '../application/data-structures/found-one-connection.ds.js';
import { buildFoundConnectionDs } from '../utils/build-found-connection.ds.js';

@Injectable()
export class FindOneConnectionUseCase
  extends AbstractUseCase<FindOneConnectionDs, FoundOneConnectionDs>
  implements IFindOneConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: FindOneConnectionDs): Promise<FoundOneConnectionDs> {
    let connection = await this._dbContext.connectionRepository.findOneConnection(inputData.connectionId);
    if (!connection) {
      throw new HttpException(
        {
          message: Messages.CONNECTION_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const accessLevel: AccessLevelEnum = await this._dbContext.userAccessRepository.getUserConnectionAccessLevel(
      inputData.cognitoUserName,
      inputData.connectionId,
    );

    if (connection.masterEncryption && !inputData.masterPwd && accessLevel !== AccessLevelEnum.none) {
      throw new HttpException(
        {
          message: Messages.MASTER_PASSWORD_MISSING,
          type: 'no_master_key',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (accessLevel === AccessLevelEnum.none) {
      for (const key in connection) {
        if (!Constants.CONNECTION_KEYS_NONE_PERMISSION.includes(key)) {
          // eslint-disable-next-line security/detect-object-injection
          delete connection[key];
        }
      }
    }
    if (accessLevel !== AccessLevelEnum.edit) {
      delete connection.signing_key;
    }

    if (connection.masterEncryption && inputData.masterPwd && accessLevel !== AccessLevelEnum.none) {
      try {
        connection = Encryptor.decryptConnectionCredentials(connection, inputData.masterPwd);
      } catch (e) {
        console.log('-> Error decrypting connection credentials', e);
        throw new HttpException(
          {
            message: Messages.FAILED_DECRYPT_CONNECTION_CREDENTIALS,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    const groupManagement = await this.checkGroupManagement(
      inputData.cognitoUserName,
      inputData.connectionId,
      accessLevel,
    );
    const connectionProperties: FoundConnectionPropertiesDs = connection.connection_properties
      ? buildFoundConnectionPropertiesDs(connection.connection_properties)
      : null;
    return {
      connection: buildFoundConnectionDs(connection),
      accessLevel: accessLevel,
      groupManagement: groupManagement,
      connectionProperties: connectionProperties,
    };
  }

  private async checkGroupManagement(
    cognitoUserName: string,
    connectionId: string,
    availableConnectionAccessLevel = AccessLevelEnum.none,
  ): Promise<boolean> {
    if (availableConnectionAccessLevel !== AccessLevelEnum.none) {
      return true;
    }
    const groupsInConnection = await this._dbContext.groupRepository.findAllGroupsInConnection(connectionId);
    for (const group of groupsInConnection) {
      const groupRead = await this._dbContext.userAccessRepository.checkUserGroupRead(cognitoUserName, group.id);
      if (groupRead) {
        return true;
      }
    }
    return false;
  }
}
