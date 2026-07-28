import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RequestRestUserPasswordDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsEmail()
	email: string;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	companyId: string;

	@ApiProperty({
		required: false,
		description:
			'Full URL prefix the reset token is appended to (satellite-provided; validated against the SaaS ' +
			'domain allowlist, otherwise the legacy frontend link is built).',
	})
	@IsOptional()
	@IsString()
	verificationLinkBase?: string;
}
