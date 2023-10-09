import { ApiProperty } from '@nestjs/swagger';
import { AccessLevelEnum } from '../../../../enums/index.js';

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

export class GroupPermissionDs {
  @ApiProperty()
  groupId: string;

  @ApiProperty({ enum: AccessLevelEnum })
  accessLevel: AccessLevelEnum;
}

export class ConnectionPermissionDs {
  @ApiProperty()
  connectionId: string;

  @ApiProperty({ enum: AccessLevelEnum })
  accessLevel: AccessLevelEnum;
}

export class ComplexPermissionDs {
  @ApiProperty()
  connection: ConnectionPermissionDs;

  @ApiProperty()
  group: GroupPermissionDs;

  @ApiProperty({ isArray: true, type: TablePermissionDs })
  tables: Array<TablePermissionDs>;
}
