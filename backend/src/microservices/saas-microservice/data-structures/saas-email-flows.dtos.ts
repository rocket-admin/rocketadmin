import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { OutgoingEmailPayloadDs } from '../../../entities/email/application/data-structures/outgoing-email-payload.ds.js';
import { EmailDto } from '../../../entities/user/dto/email.dto.js';
import { FoundUserDto } from '../../../entities/user/dto/found-user.dto.js';
import { RequestRestUserPasswordDto } from '../../../entities/user/dto/request-rest-user-password.dto.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';

// Bodies of the internal (microservice-JWT) email-flow bridges the SaaS control plane calls.
// The `verificationLinkBase` fields are URL prefixes the token is appended to; they are validated
// against the SaaS domain allowlist (ValidationHelper.resolveEmailVerificationLinkBase) and fall
// back to the legacy frontend links when absent or not allowed.
// `suppressEmail` (plan 15 Phase 2) inverts the trigger: the bridge skips the send and returns an
// `emailPayload` (raw token + context) instead, so the SaaS caller composes and sends in-process.
// The flag exists ONLY on these bridge DTOs — the core's public routes never honor it.

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

	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	suppressEmail?: boolean;
}

export class SaasRequestPasswordResetDto extends RequestRestUserPasswordDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	suppressEmail?: boolean;
}

export class SaasVerifyEmailChangeDto extends EmailDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	suppressEmail?: boolean;
}

// Register-bridge response: FoundUserDto plus the suppressed-email payload (present only when the
// caller set `suppressEmail: true`).
export class SaasRegisteredUserRO extends FoundUserDto {
	@ApiProperty({ required: false, type: OutgoingEmailPayloadDs })
	emailPayload?: OutgoingEmailPayloadDs;
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

	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	suppressEmail?: boolean;
}
