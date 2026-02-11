import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserActionEnum } from '../../../enums/index.js';

export class CreateUserActionDto {
	@ApiProperty({ enum: UserActionEnum })
	@IsNotEmpty()
	@IsEnum(UserActionEnum)
	message: UserActionEnum;
}
