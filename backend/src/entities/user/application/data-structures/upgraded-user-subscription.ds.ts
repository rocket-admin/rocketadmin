import { ApiProperty } from '@nestjs/swagger';

export class UpgradedUserSubscriptionDs {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}
