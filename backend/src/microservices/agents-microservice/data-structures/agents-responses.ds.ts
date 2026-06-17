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

export class CompanySubscriptionInfoRO {
	@ApiProperty({ description: 'Whether the backend is running in SaaS mode. When false, no subscription applies.' })
	isSaaS: boolean;

	@ApiPropertyOptional({ nullable: true })
	companyId: string | null;

	@ApiPropertyOptional({ nullable: true, description: 'FREE_PLAN | TEAM_PLAN | ENTERPRISE_PLAN | ANNUAL_* | null' })
	subscriptionLevel: string | null;

	@ApiProperty()
	isPaymentMethodAdded: boolean;
}
