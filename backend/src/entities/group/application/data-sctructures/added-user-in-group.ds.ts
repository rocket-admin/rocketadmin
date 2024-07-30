import { ApiProperty } from '@nestjs/swagger';
import { FoundGroupResponseDto } from '../../dto/found-group-response.dto.js';

export class AddedUserInGroupDs {
  @ApiProperty()
  group: FoundGroupResponseDto;

  @ApiProperty()
  message: string;

  @ApiProperty()
  external_invite: boolean;
}
