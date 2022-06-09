import { AccessLevelEnum } from '../../../../enums';

export class CreatePermissionsDs {
  groupId: string;
  masterPwd: string;
  permissions: PermissionsDs;
  userId: string;
}

export class PermissionsDs {
  connection: {
    accessLevel: AccessLevelEnum;
    connectionId: string;
  };
  group: {
    accessLevel: AccessLevelEnum;
    groupId: string;
  };
  tables: Array<TablePermissionDs>;
}

export class TablePermissionDs {
  accessLevel: TableAccessLevelsDs;
  tableName: string;
}

export class TableAccessLevelsDs {
  add: boolean;
  delete: boolean;
  edit: boolean;
  readonly: boolean;
  visibility: boolean;
}
