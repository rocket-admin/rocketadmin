import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInitialUserDto {
	@ApiProperty({ description: 'User email' })
	@IsNotEmpty()
	@IsString()
	@IsEmail()
	readonly email: string;

	@ApiProperty({ description: 'Admin user password' })
	@IsNotEmpty()
	@IsString()
	@MinLength(8)
	@MaxLength(255)
	readonly password: string;
}
