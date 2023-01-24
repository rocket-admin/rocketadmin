import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums/index.js';
import { PermissionEntity } from '../permission.entity.js';

export function buildNewPermissionEntityConnection(accessLevel: AccessLevelEnum): PermissionEntity {
  const newPermission = new PermissionEntity();
  newPermission.type = PermissionTypeEnum.Connection;
  newPermission.accessLevel = accessLevel;
  return newPermission;
}
