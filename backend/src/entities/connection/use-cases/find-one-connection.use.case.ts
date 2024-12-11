import { BadRequestException, HttpStatus, Inject, Injectable } from '@nestjs/common';
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
import { ConnectionEntity } from '../connection.entity.js';
import { FilteredConnection } from './find-all-connections.use.case.js';

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
    const connection = await this._dbContext.connectionRepository.findOneConnection(inputData.connectionId);
    if (!connection) {
      throw new BadRequestException(Messages.CONNECTION_NOT_FOUND);
    }
    const accessLevel: AccessLevelEnum = await this._dbContext.userAccessRepository.getUserConnectionAccessLevel(
      inputData.cognitoUserName,
      inputData.connectionId,
    );

    if (connection.masterEncryption && !inputData.masterPwd) {
      throw new HttpException(
        {
          message: Messages.MASTER_PASSWORD_MISSING,
          type: 'no_master_key',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (connection.masterEncryption && inputData.masterPwd) {
      const isMaterPwdValid = await Encryptor.verifyUserPassword(inputData.masterPwd, connection.master_hash);
      if (!isMaterPwdValid) {
        throw new HttpException(
          {
            message: Messages.MASTER_PASSWORD_INCORRECT,
            type: 'invalid_master_key',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const filterConnectionKeys = (connection: ConnectionEntity, allowedKeys: Array<string>): FilteredConnection => {
      return Object.keys(connection).reduce((acc, key) => {
        if (allowedKeys.includes(key)) {
          // eslint-disable-next-line security/detect-object-injection
          acc[key] = connection[key];
        }
        return acc;
      }, {} as FilteredConnection);
    };
    let filteredConnection: FilteredConnection = connection;

    if (accessLevel === AccessLevelEnum.none) {
      filteredConnection = filterConnectionKeys(connection, Constants.CONNECTION_KEYS_NONE_PERMISSION);
    } else if (accessLevel !== AccessLevelEnum.edit) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { signing_key, ...rest } = connection;
      filteredConnection = rest;
    }

    if (filteredConnection.masterEncryption && inputData.masterPwd && accessLevel !== AccessLevelEnum.none) {
      try {
        filteredConnection = Encryptor.decryptConnectionCredentials(connection, inputData.masterPwd);
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
      connection: buildFoundConnectionDs(filteredConnection),
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
