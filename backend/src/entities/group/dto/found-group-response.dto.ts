import { ApiProperty } from '@nestjs/swagger';
import { SimpleFoundUserInfoDs } from '../../user/dto/found-user.dto.js';

export class FoundGroupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  isMain: boolean;

  @ApiProperty({ required: false, isArray: true, type: SimpleFoundUserInfoDs })
  users?: Array<SimpleFoundUserInfoDs>;
}
