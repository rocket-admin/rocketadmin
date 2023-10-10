import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionLevelEnum } from '../../../../enums/subscription-level.enum.js';

export class AddStripeSetupIntentDs {
  userId: string;

  @ApiProperty()
  defaultPaymentMethodId: string;

  @ApiProperty({ enum: SubscriptionLevelEnum })
  subscriptionLevel: SubscriptionLevelEnum;
}
