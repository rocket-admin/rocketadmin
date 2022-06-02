import { ApiProperty } from '@nestjs/swagger';
import { UserActionEnum } from '../../../enums';

export class CreateUserActionDto {
  @ApiProperty()
  message: UserActionEnum;
}
