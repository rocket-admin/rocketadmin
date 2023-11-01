import { IsEnum, IsNotEmpty } from 'class-validator';
import { SubscriptionLevelEnum } from '../../../enums/index.js';
import { ApiProperty } from '@nestjs/swagger';

export class UpgradeSubscriptionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(SubscriptionLevelEnum)
  subscriptionLevel: SubscriptionLevelEnum;
}
