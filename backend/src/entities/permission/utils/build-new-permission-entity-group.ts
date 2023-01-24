import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums/index.js';
import { PermissionEntity } from '../permission.entity.js';

export function buildNewPermissionEntityGroup(accessLevel: AccessLevelEnum): PermissionEntity {
  const newPermission = new PermissionEntity();
  newPermission.type = PermissionTypeEnum.Group;
  newPermission.accessLevel = accessLevel;
  return newPermission;
}
