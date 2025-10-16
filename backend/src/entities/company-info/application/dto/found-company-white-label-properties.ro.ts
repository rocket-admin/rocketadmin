import { ApiProperty } from '@nestjs/swagger';
import { FoundCompanyImageInfo } from './found-company-logo.ro.js';
import { SubscriptionLevelEnum } from '../../../../enums/subscription-level.enum.js';

export class FoundCompanyWhiteLabelPropertiesRO {
  @ApiProperty({ type: FoundCompanyImageInfo, required: false })
  logo: FoundCompanyImageInfo;

  @ApiProperty({ type: FoundCompanyImageInfo, required: false })
  favicon: FoundCompanyImageInfo;

  @ApiProperty({ type: String, required: false })
  tab_title: string;

  @ApiProperty({ enum: SubscriptionLevelEnum })
  subscriptionLevel: SubscriptionLevelEnum;
}
