import { GroupEntity } from '../../../group/group.entity.js';
import { AccessLevelEnum } from '../../../../enums/index.js';
import { ApiProperty } from '@nestjs/swagger';

export class FoundUserGroupsInConnectionDs {
  @ApiProperty()
  group: Omit<GroupEntity, 'connection' | 'users'>;

  @ApiProperty({ enum: AccessLevelEnum })
  accessLevel: AccessLevelEnum;
}
