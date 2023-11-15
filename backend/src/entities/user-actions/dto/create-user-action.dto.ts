import { ApiProperty } from '@nestjs/swagger';
import { UserActionEnum } from '../../../enums/index.js';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CreateUserActionDto {
  @ApiProperty({ enum: UserActionEnum })
  @IsNotEmpty()
  @IsEnum(UserActionEnum)
  message: UserActionEnum;
}
