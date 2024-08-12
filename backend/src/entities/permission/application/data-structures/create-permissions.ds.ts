import { ApiProperty } from '@nestjs/swagger';
import { AccessLevelEnum } from '../../../../enums/index.js';
import { IsArray, IsBoolean, IsEnum, IsString, IsUUID, ValidateNested } from 'class-validator';

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
  @IsBoolean()
  add: boolean;

  @ApiProperty()
  @IsBoolean()
  delete: boolean;

  @ApiProperty()
  @IsBoolean()
  edit: boolean;

  @ApiProperty()
  @IsBoolean()
  readonly: boolean;

  @ApiProperty()
  @IsBoolean()
  visibility: boolean;
}

export class TablePermissionDs {
  @ApiProperty({ type: TableAccessLevelsDs })
  @ValidateNested()
  accessLevel: TableAccessLevelsDs;

  @ApiProperty()
  @IsString()
  tableName: string;
}

export class GroupPermissionDs {
  @ApiProperty()
  @IsString()
  @IsUUID()
  groupId: string;

  @ApiProperty({ enum: AccessLevelEnum })
  @IsEnum(AccessLevelEnum)
  accessLevel: AccessLevelEnum;
}

export class ConnectionPermissionDs {
  @ApiProperty()
  @IsString()
  connectionId: string;

  @ApiProperty({ enum: AccessLevelEnum })
  @IsEnum(AccessLevelEnum)
  accessLevel: AccessLevelEnum;
}

export class ComplexPermissionDs {
  @ApiProperty({ type: ConnectionPermissionDs })
  @ValidateNested()
  connection: ConnectionPermissionDs;

  @ApiProperty({ type: GroupPermissionDs })
  @ValidateNested()
  group: GroupPermissionDs;

  @ApiProperty({ isArray: true, type: TablePermissionDs })
  @IsArray()
  @ValidateNested({ each: true })
  tables: Array<TablePermissionDs>;
}
