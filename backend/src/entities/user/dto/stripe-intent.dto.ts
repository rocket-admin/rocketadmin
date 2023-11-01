import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionLevelEnum } from '../../../enums/subscription-level.enum.js';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class StripeIntentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  defaultPaymentMethodId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(SubscriptionLevelEnum)
  subscriptionLevel: SubscriptionLevelEnum;
}
