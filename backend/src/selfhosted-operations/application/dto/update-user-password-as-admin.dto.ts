import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserPasswordAsAdminDto {
	@ApiProperty({ description: 'New password for the target user' })
	@IsNotEmpty()
	@IsString()
	@MinLength(8)
	@MaxLength(255)
	readonly newPassword: string;
}
