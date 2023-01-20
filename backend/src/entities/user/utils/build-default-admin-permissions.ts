import { PermissionEntity } from '../../permission/permission.entity.js';
import { GroupEntity } from '../../group/group.entity.js';
import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums/index.js';

export function buildDefaultAdminPermissions(groups: Array<GroupEntity>): Array<PermissionEntity> {
  const permissions: Array<PermissionEntity> = [];
  for (const group of groups) {
    const connectionAdminPermission = new PermissionEntity();
    connectionAdminPermission.type = PermissionTypeEnum.Connection;
    connectionAdminPermission.accessLevel = AccessLevelEnum.edit;
    connectionAdminPermission.groups = [];
    connectionAdminPermission.groups.push(group);

    permissions.push(connectionAdminPermission);

    const groupAdminPermission = new PermissionEntity();
    groupAdminPermission.type = PermissionTypeEnum.Group;
    groupAdminPermission.accessLevel = AccessLevelEnum.edit;
    groupAdminPermission.groups = [];
    groupAdminPermission.groups.push(group);

    permissions.push(groupAdminPermission);
  }
  return permissions;
}
