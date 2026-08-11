import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsEmail,
	IsIn,
	IsJSON,
	IsNotEmpty,
	IsOptional,
	IsString,
	IsStrongPassword,
	IsUUID,
	MaxLength,
} from 'class-validator';

// Bodies of the internal (microservice-JWT) user-account bridges the SaaS control plane calls
// (plan 15 Phases 4/5). End-user authorization happens on the SaaS side (cookie + guards) —
// these bridges only trust the microservice JWT, exactly like `saas/user/register`.

export class SaasUserPasswordChangeDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	userId: string;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsEmail()
	email: string;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	oldPassword: string;

	// Same strength policy as the core's public route (ChangeUsualUserPasswordDto).
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@MaxLength(255)
	@IsStrongPassword({
		minLength: 8,
		minLowercase: 1,
		minUppercase: 1,
		minNumbers: 1,
		minSymbols: 0,
	})
	newPassword: string;
}

export class SaasChangeUserNameDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	userId: string;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	name: string;
}

export class SaasDeleteUserAccountDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	userId: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	reason?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	message?: string;
}

export class SaasSaveUserSettingsDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	userId: string;

	// Mirrors the core's UserSettingsDataRequestDto (`userSettings` is a JSON string).
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsJSON()
	userSettings: string;
}

export class SaasToggleTestConnectionsDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	userId: string;

	// Mirrors the core's public route query param (`?displayMode=on|off`).
	@ApiProperty({ enum: ['on', 'off'] })
	@IsNotEmpty()
	@IsString()
	@IsIn(['on', 'off'])
	displayMode: 'on' | 'off';
}

export class SaasUserIdDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	userId: string;
}

export class SaasOtpCodeDto extends SaasUserIdDto {
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@MaxLength(12)
	otpCode: string;
}

export class SaasOtpLoginDto {
	// The temporary (TEMPORARY_JWT_SECRET-signed, 4-min TTL) token issued at the password step of
	// a 2FA login. Read server-side from the cookie by the SaaS caller — never accepted from JS.
	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	temporaryToken: string;

	@ApiProperty()
	@IsNotEmpty()
	@IsString()
	@MaxLength(12)
	otpCode: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	ipAddress?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	userAgent?: string;
}
