import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums';
import { PermissionEntity } from '../permission.entity';

export function buildNewPermissionEntityConnection(accessLevel: AccessLevelEnum): PermissionEntity {
  const newPermission = new PermissionEntity();
  newPermission.type = PermissionTypeEnum.Connection;
  newPermission.accessLevel = accessLevel;
  return newPermission;
}
