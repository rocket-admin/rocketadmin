import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RevokeInvitationRequestDto {
	@IsString()
	@IsNotEmpty()
	@IsEmail()
	@ApiProperty()
	email: string;
}
