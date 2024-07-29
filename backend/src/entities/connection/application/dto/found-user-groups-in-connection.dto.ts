import { ApiProperty } from '@nestjs/swagger';
import { AccessLevelEnum } from '../../../../enums/access-level.enum.js';
import { SimpleFoundUserInfoDs } from '../../../user/dto/found-user.dto.js';

export class FoundGroupInConnectionDTO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isMain: boolean;

  @ApiProperty({ required: false, isArray: true, type: SimpleFoundUserInfoDs })
  users?: Array<SimpleFoundUserInfoDs>;
}

export class FoundUserGroupsInConnectionDTO {
  @ApiProperty({ type: FoundGroupInConnectionDTO })
  group: FoundGroupInConnectionDTO;

  @ApiProperty({ enum: AccessLevelEnum })
  accessLevel: AccessLevelEnum;
}
