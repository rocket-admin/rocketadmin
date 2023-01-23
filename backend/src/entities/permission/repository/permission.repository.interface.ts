import { PermissionEntity } from '../permission.entity.js';
import { GroupEntity } from '../../group/group.entity.js';
import { AccessLevelEnum } from '../../../enums/index.js';
import { TablePermissionDs } from '../application/data-structures/create-permissions.ds.js';

export interface IPermissionRepository {
  saveNewOrUpdatedPermission(permissionData: PermissionEntity): Promise<PermissionEntity>;

  createdDefaultAdminPermissionsInGroup(group: GroupEntity): Promise<Array<PermissionEntity>>;

  getGroupPermissionForConnection(connectionId: string, groupId: string): Promise<AccessLevelEnum>;

  getGroupPermissionsForGroup(connectionId: string, groupId: string): Promise<AccessLevelEnum>;

  getGroupPermissionsForTable(connectionId: string, groupId: string, tableName: string): Promise<TablePermissionDs>;

  getGroupPermissionsForAllTables(connectionId: string, groupId: string): Promise<Array<PermissionEntity>>;

  getPermissionEntityForConnection(connectionId: string, groupId: string): Promise<PermissionEntity>;

  getPermissionEntityForGroup(connectionId: string, groupId: string): Promise<PermissionEntity>;

  removePermissionEntity(permission: PermissionEntity): Promise<PermissionEntity>;

  getAllUserPermissionsForAllTablesInConnection(userId: string, connectionId: string): Promise<Array<PermissionEntity>>;
}
