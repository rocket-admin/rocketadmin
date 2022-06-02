import { PermissionEntity } from '../permission.entity';
import { TablePermissionDs } from '../application/data-structures/create-permissions.ds';
import { AccessLevelEnum } from '../../../enums';
import { getUniqArrayStrings } from '../../../helpers';

export function buildFinalTablesPermissions(
  permissionsOnStart: Array<PermissionEntity>,
  deletedPermissions: Array<PermissionEntity>,
  createdPermissions: Array<PermissionEntity>,
): Array<TablePermissionDs> {
  const filteredPermissions: Array<PermissionEntity> = permissionsOnStart.filter((permission: PermissionEntity) => {
    return !deletedPermissions.find((deletedPermission) =>
      comparePermissionsByProperties(deletedPermission, permission),
    );
  });

  const totalPermissions: Array<PermissionEntity> = filteredPermissions.concat(createdPermissions);
  let tableNames: Array<string> = totalPermissions.map((permission) => permission.tableName);
  tableNames = getUniqArrayStrings(tableNames);
  return tableNames.map((tableName): TablePermissionDs => {
    return {
      accessLevel: {
        add: !!totalPermissions.find(
          (permission) => permission.tableName === tableName && permission.accessLevel === AccessLevelEnum.add,
        ),
        delete: !!totalPermissions.find(
          (permission) => permission.tableName === tableName && permission.accessLevel === AccessLevelEnum.delete,
        ),
        edit: !!totalPermissions.find(
          (permission) => permission.tableName === tableName && permission.accessLevel === AccessLevelEnum.edit,
        ),
        readonly: !!totalPermissions.find(
          (permission) => permission.tableName === tableName && permission.accessLevel === AccessLevelEnum.readonly,
        ),
        visibility: !!totalPermissions.find(
          (permission) => permission.tableName === tableName && permission.accessLevel === AccessLevelEnum.visibility,
        ),
      },
      tableName: tableName,
    };
  });
}

function comparePermissionsByProperties(f_permission: PermissionEntity, s_permission: PermissionEntity): boolean {
  return (
    f_permission.accessLevel === s_permission.accessLevel &&
    f_permission.tableName === s_permission.tableName &&
    f_permission.type === s_permission.type
  );
}
