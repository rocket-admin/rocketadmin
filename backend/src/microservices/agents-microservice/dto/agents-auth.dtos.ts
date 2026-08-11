import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtScopesEnum } from '../../../entities/user/enums/jwt-scopes.enum.js';

export class ValidateUserTokenDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	token: string;

	@ApiPropertyOptional({
		isArray: true,
		enum: JwtScopesEnum,
		description:
			"Scopes the caller is willing to accept on the token (plan 15 Phase 5). When it includes '2fa_enable', " +
			'validation mirrors NonScopedAuthMiddleware (no 2fa-scope rejection, no suspension check). ' +
			'Absent = current strict behavior.',
	})
	@IsOptional()
	@IsArray()
	@IsIn(Object.values(JwtScopesEnum), { each: true })
	allowScopes?: Array<JwtScopesEnum>;
}

export class ValidateTableAiRequestDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	userId: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	connectionId: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	tableName: string;
}

export class ValidateConnectionEditDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	userId: string;

	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	connectionId: string;
}
