import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserActionEnum } from '../../../enums/user-action.enum.js';

export class CreateUserActionDto {
	@ApiProperty({ enum: UserActionEnum })
	@IsNotEmpty()
	@IsEnum(UserActionEnum)
	message: UserActionEnum;
}
