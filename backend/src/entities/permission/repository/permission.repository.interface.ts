import { PermissionEntity } from '../permission.entity';
import { GroupEntity } from '../../group/group.entity';
import { AccessLevelEnum } from '../../../enums';
import { TablePermissionDs } from '../application/data-structures/create-permissions.ds';

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
}
