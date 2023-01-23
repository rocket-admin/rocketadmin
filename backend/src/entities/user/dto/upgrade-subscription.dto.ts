import { IsNotEmpty } from 'class-validator';
import { SubscriptionLevelEnum } from '../../../enums/index.js';

export class UpgradeSubscriptionDto {
  @IsNotEmpty()
  subscriptionLevel: SubscriptionLevelEnum;
}
