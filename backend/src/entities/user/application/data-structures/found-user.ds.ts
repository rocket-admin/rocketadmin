import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionLevelEnum } from '../../../../enums/index.js';

export class CompanyIdDS {
  @ApiProperty()
  id: string;
}

export class FoundUserDs {
  @ApiProperty()
  id: string;
  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  portal_link?: string;

  @ApiProperty({ required: false })
  subscriptionLevel?: SubscriptionLevelEnum;

  @ApiProperty({ required: false })
  intercom_hash?: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  is_2fa_enabled: boolean;

  @ApiProperty({ required: false })
  company?: CompanyIdDS;
}
