import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidatedUserTokenRO {
	@ApiProperty()
	sub: string;

	@ApiPropertyOptional()
	email: string | null;

	@ApiPropertyOptional()
	exp: number | null;

	@ApiPropertyOptional()
	iat: number | null;
}

export class PermissionAllowedRO {
	@ApiProperty()
	allowed: boolean;
}

export class AiConnectionContextRO {
	@ApiProperty()
	connectionId: string;

	@ApiProperty()
	type: string;

	@ApiPropertyOptional()
	schema: string | null;

	@ApiProperty()
	isMongoDb: boolean;

	@ApiProperty()
	userEmail: string;
}

export class AiQueryResultRO {
	@ApiProperty()
	result: unknown;
}
