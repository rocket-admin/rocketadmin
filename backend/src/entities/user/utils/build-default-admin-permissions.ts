import { PermissionEntity } from '../../permission/permission.entity';
import { GroupEntity } from '../../group/group.entity';
import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums';

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
    connectionAdminPermission.groups = [];
    connectionAdminPermission.groups.push(group);

    permissions.push(groupAdminPermission);
  }
  return permissions;
}
