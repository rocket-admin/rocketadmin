import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';

// Bodies of the internal (microservice-JWT) email-flow bridges the SaaS control plane calls.
// The `verificationLinkBase` fields are URL prefixes the token is appended to; they are validated
// against the SaaS domain allowlist (ValidationHelper.resolveEmailVerificationLinkBase) and fall
// back to the legacy frontend links when absent or not allowed.

export class SaasUserIdWithLinkBaseDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	userId: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	verificationLinkBase?: string;
}

export class SaasInviteUserInCompanyDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	inviterId: string;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsEmail()
	email: string;

	@ApiProperty({ enum: UserRoleEnum })
	@IsNotEmpty()
	@IsEnum(UserRoleEnum)
	role: UserRoleEnum;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@IsUUID()
	groupId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	inviteLinkBase?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	emailVerificationLinkBase?: string;
}
