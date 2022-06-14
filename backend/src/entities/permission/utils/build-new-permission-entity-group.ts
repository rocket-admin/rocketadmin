import { AccessLevelEnum, PermissionTypeEnum } from '../../../enums';
import { PermissionEntity } from '../permission.entity';

export function buildNewPermissionEntityGroup(accessLevel: AccessLevelEnum): PermissionEntity {
  const newPermission = new PermissionEntity();
  newPermission.type = PermissionTypeEnum.Group;
  newPermission.accessLevel = accessLevel;
  return newPermission;
}
