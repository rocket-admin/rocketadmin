import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserEmailAsAdminDto {
	@ApiProperty({ description: 'New email for the target user' })
	@IsNotEmpty()
	@IsString()
	@IsEmail()
	readonly newEmail: string;
}
