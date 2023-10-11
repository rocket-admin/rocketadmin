import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionLevelEnum } from '../../../../enums/index.js';

export class UpgradeUserSubscriptionDs {
  cognitoUserName: string;

  @ApiProperty()
  subscriptionLevel: SubscriptionLevelEnum;
}
