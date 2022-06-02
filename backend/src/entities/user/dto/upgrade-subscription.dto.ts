import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { SubscriptionLevelEnum } from '../../../enums';

export class UpgradeSubscriptionDto {
  @ApiProperty()
  @IsNotEmpty()
  subscriptionLevel: SubscriptionLevelEnum;
}
