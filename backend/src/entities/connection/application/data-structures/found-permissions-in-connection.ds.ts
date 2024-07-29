import { ApiProperty } from '@nestjs/swagger';
import { AccessLevelEnum } from '../../../../enums/index.js';

export class FoundConnectionPermissionsDs {
  @ApiProperty()
  connectionId: string;

  @ApiProperty({ enum: AccessLevelEnum })
  accessLevel: AccessLevelEnum;
}

export class FoundConnectionGroupPermissionDs {
  @ApiProperty()
  groupId: string;

  @ApiProperty({ enum: AccessLevelEnum })
  accessLevel: AccessLevelEnum;
}

export class FoundTablePermissionsDs {
  @ApiProperty()
  visibility: boolean;

  @ApiProperty()
  readonly: boolean;

  @ApiProperty()
  add: boolean;

  @ApiProperty()
  delete: boolean;

  @ApiProperty()
  edit: boolean;
}

export class FoundTablesWithPermissionsDs {
  @ApiProperty()
  tableName: string;

  @ApiProperty()
  display_name: string;

  @ApiProperty({ type: FoundTablePermissionsDs })
  accessLevel: FoundTablePermissionsDs;
}

export class FoundPermissionsInConnectionDs {
  @ApiProperty({ type: FoundConnectionPermissionsDs })
  connection: FoundConnectionPermissionsDs;

  @ApiProperty({ type: FoundConnectionGroupPermissionDs })
  group: FoundConnectionGroupPermissionDs;

  @ApiProperty({ isArray: true, type: FoundTablesWithPermissionsDs })
  tables: Array<FoundTablesWithPermissionsDs>;
}
