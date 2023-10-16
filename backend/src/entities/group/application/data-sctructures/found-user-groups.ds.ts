import { ApiProperty } from '@nestjs/swagger';
import { AccessLevelEnum } from '../../../../enums/index.js';
import { SimpleFoundUserInfoDs } from '../../../user/application/data-structures/found-user.ds.js';

export class FoundGroupDataInfoDs {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isMain: boolean;
}

export class FoundGroupDataWithUsersDs extends FoundGroupDataInfoDs {
  @ApiProperty({ isArray: true })
  users: Array<SimpleFoundUserInfoDs>;
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
