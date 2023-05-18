import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { getDataAccessObject } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/create-data-access-object.js';
import { TablePermissionDs } from '../../permission/application/data-structures/create-permissions.ds.js';
import { FoundPermissionsInConnectionDs } from '../application/data-structures/found-permissions-in-connection.ds.js';
import { GetPermissionsInConnectionDs } from '../application/data-structures/get-permissions-in-connection.ds.js';
import { IGetPermissionsForGroupInConnection } from './use-cases.interfaces.js';

@Injectable()
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
    const dao = getDataAccessObject(connection);
    const tables: Array<string> = (await dao.getTablesFromDB()).map((table) => table.tableName);
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
