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

export class TableAccessLevelsDs {
  @ApiProperty()
  add: boolean;

  @ApiProperty()
  delete: boolean;

  @ApiProperty()
  edit: boolean;

  @ApiProperty()
  readonly: boolean;

  @ApiProperty()
  visibility: boolean;
}

export class TablePermissionDs {
  @ApiProperty()
  accessLevel: TableAccessLevelsDs;

  @ApiProperty()
  tableName: string;
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
