import { ApiProperty } from '@nestjs/swagger';
import { AccessLevelEnum } from '../../../../enums/index.js';

export class FoundGroupDataInfoDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isMain: boolean;
}

export class FoundGroupDataWithAccessLevelDs {
  @ApiProperty()
  group: FoundGroupDataInfoDs;

  @ApiProperty({ enum: AccessLevelEnum })
  accessLevel: AccessLevelEnum;
}

export class FoundUserGroupsDs {
  @ApiProperty({ isArray: true, type: FoundGroupDataWithAccessLevelDs })
  groups: Array<FoundGroupDataWithAccessLevelDs>;

  @ApiProperty()
  groupsCount: number;
}
