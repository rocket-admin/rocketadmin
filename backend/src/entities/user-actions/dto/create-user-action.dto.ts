import { ApiProperty } from '@nestjs/swagger';
import { UserActionEnum } from '../../../enums/index.js';

export class CreateUserActionDto {
  @ApiProperty()
  message: UserActionEnum;
}
