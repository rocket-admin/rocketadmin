import AbstractUseCase from '../../../common/abstract-use.case';
import { BaseType } from '../../../common/data-injection.tokens';
import { FoundPermissionsInConnectionDs } from '../application/data-structures/found-permissions-in-connection.ds';
import { GetPermissionsInConnectionDs } from '../application/data-structures/get-permissions-in-connection.ds';
import { IGetPermissionsForGroupInConnection } from './use-cases.interfaces';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { TablePermissionDs } from '../../permission/application/data-structures/create-permissions.ds';
import { createDataAccessObject } from '../../../data-access-layer/shared/create-data-access-object';

@Injectable({ scope: Scope.REQUEST })
export class GetPermissionsForGroupInConnectionUseCase
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
    const groupPermissionForConnection = await this._dbContext.permissionRepository.getGroupPermissionForConnection(
      inputData.connectionId,
      inputData.groupId,
    );
    const groupPermissionForGroup = await this._dbContext.permissionRepository.getGroupPermissionsForGroup(
      inputData.connectionId,
      inputData.groupId,
    );
    const connection = await this._dbContext.connectionRepository.findAndDecryptConnection(
      inputData.connectionId,
      inputData.masterPwd,
    );
    const dao = createDataAccessObject(connection, inputData.cognitoUserName);
    const tables: Array<string> = await dao.getTablesFromDB();

    const tablesWithAccessLevels: Array<TablePermissionDs> = await Promise.all(
      tables.map(async (table: string) => {
        return await this._dbContext.permissionRepository.getGroupPermissionsForTable(
          inputData.connectionId,
          inputData.groupId,
          table,
        );
      }),
    );
    return {
      connection: {
        connectionId: inputData.connectionId,
        accessLevel: groupPermissionForConnection,
      },
      group: {
        groupId: inputData.groupId,
        accessLevel: groupPermissionForGroup,
      },
      tables: tablesWithAccessLevels,
    };
  }
}
