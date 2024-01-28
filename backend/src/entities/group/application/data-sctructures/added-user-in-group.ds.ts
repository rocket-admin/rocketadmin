import { ApiProperty } from '@nestjs/swagger';
import { GroupEntity } from '../../group.entity.js';

export class AddedUserInGroupDs {
  @ApiProperty()
  group: Omit<GroupEntity, 'connection'>;

  @ApiProperty()
  message: string;

  @ApiProperty()
  external_invite: boolean;
}
