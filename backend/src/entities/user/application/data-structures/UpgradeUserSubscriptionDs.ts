import { SubscriptionLevelEnum } from '../../../../enums/index.js';
import { ApiProperty } from '@nestjs/swagger';

export class UpgradeUserSubscriptionDs {
  @ApiProperty({ enum: SubscriptionLevelEnum })
  subscriptionLevel: SubscriptionLevelEnum;
  
  cognitoUserName: string;
}
