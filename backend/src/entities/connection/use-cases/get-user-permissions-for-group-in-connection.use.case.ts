import { Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case';
import { GetPermissionsInConnectionDs } from '../application/data-structures/get-permissions-in-connection.ds';
import { FoundPermissionsInConnectionDs } from '../application/data-structures/found-permissions-in-connection.ds';
import { IGetPermissionsForGroupInConnection } from './use-cases.interfaces';
import { BaseType } from '../../../common/data-injection.tokens';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { TablePermissionDs } from '../../permission/application/data-structures/create-permissions.ds';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';

@Injectable({ scope: Scope.REQUEST })
export class GetUserPermissionsForGroupInConnectionUseCase
  extends AbstractUseCase<GetPermissionsInConnectionDs, FoundPermissionsInConnectionDs>
  implements IGetPermissionsForGroupInConnection
{
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: GetPermissionsInConnectionDs): Promise<FoundPermissionsInConnectionDs> {
    const { connectionId, groupId, cognitoUserName, masterPwd } = inputData;
    const userConnectionAccessLevel = await this._dbContext.userAccessRepository.getUserConnectionAccessLevel(
      cognitoUserName,
      connectionId,
    );
    const userGroupAccessLevel = await this._dbContext.userAccessRepository.getGroupAccessLevel(
      cognitoUserName,
      groupId,
    );

    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(connectionId, masterPwd);
    const dao = createDataAccessObject(connection, inputData.cognitoUserName);
    const tables: Array<string> = await dao.getTablesFromDB();
    const tablesWithAccessLevels: Array<TablePermissionDs> = await Promise.all(
      tables.map(async (table) => {
        return await this._dbContext.userAccessRepository.getUserTablePermissions(
          cognitoUserName,
          connectionId,
          table,
          masterPwd,
        );
      }),
    );
    return {
      connection: {
        connectionId: connectionId,
        accessLevel: userConnectionAccessLevel,
      },
      group: {
        groupId: groupId,
        accessLevel: userGroupAccessLevel,
      },
      tables: tablesWithAccessLevels,
    };
  }
}
