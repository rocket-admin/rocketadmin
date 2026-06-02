import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionLevelEnum } from '../../../../enums/subscription-level.enum.js';
import { FoundCompanyImageInfo } from './found-company-logo.ro.js';

export class FoundCompanyWhiteLabelPropertiesRO {
	@ApiProperty({ type: FoundCompanyImageInfo, required: false, nullable: true })
	logo: FoundCompanyImageInfo | null;

	@ApiProperty({ type: FoundCompanyImageInfo, required: false, nullable: true })
	favicon: FoundCompanyImageInfo | null;

	@ApiProperty({ type: String, required: false, nullable: true })
	tab_title: string | null;

	@ApiProperty({ enum: SubscriptionLevelEnum, nullable: true })
	subscriptionLevel: SubscriptionLevelEnum | null;
}
