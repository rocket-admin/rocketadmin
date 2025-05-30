import { ApiProperty } from '@nestjs/swagger';
import { FoundSipleConnectionInfoDS } from '../../../connection/application/data-structures/found-connections.ds.js';
import { FoundCompanyImageInfo } from '../dto/found-company-logo.ro.js';
import { FoundInvitationInCompanyDs } from './found-invitation-in-company.ds.js';

export class FoundUserCompanyInfoDs {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  additional_info?: string;

  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;

  @ApiProperty({ required: false })
  portal_link?: string;

  @ApiProperty({ required: false })
  subscriptionLevel?: string;

  @ApiProperty({ required: false })
  is_payment_method_added?: boolean;

  @ApiProperty({ required: false })
  is2faEnabled: boolean;

  @ApiProperty()
  show_test_connections: boolean;

  @ApiProperty({ required: false })
  custom_domain: string | null;

  @ApiProperty({ required: false, type: FoundCompanyImageInfo })
  logo: FoundCompanyImageInfo;

  @ApiProperty({ required: false, type: FoundCompanyImageInfo })
  favicon: FoundCompanyImageInfo;

  @ApiProperty({ required: false })
  tab_title: string;
}

export class FoundUserFullCompanyInfoDs extends FoundUserCompanyInfoDs {
  @ApiProperty({ isArray: true })
  connections: Array<FoundSipleConnectionInfoDS>;

  @ApiProperty({ isArray: true, type: FoundInvitationInCompanyDs })
  invitations: Array<FoundInvitationInCompanyDs>;
}

export class FoundUserEmailCompaniesInfoDs {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  name?: string;
}
