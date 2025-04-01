import { ApiProperty } from '@nestjs/swagger';
import { FoundInvitationInCompanyDs } from './found-invitation-in-company.ds.js';
import { FoundSipleConnectionInfoDS } from '../../../connection/application/data-structures/found-connections.ds.js';

export class FoundCompanyAddressDs {
  id: string;

  @ApiProperty({ required: false })
  street?: string;

  @ApiProperty({ required: false })
  number?: string;

  @ApiProperty({ required: false })
  complement?: string;

  @ApiProperty({ required: false })
  neighborhood?: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  state?: string;

  @ApiProperty({ required: false })
  country?: string;

  @ApiProperty({ required: false })
  zipCode?: string;

  @ApiProperty({ required: false })
  createdAt?: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;
}

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
  address?: FoundCompanyAddressDs;

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

  @ApiProperty({ required: false, type: 'string', format: 'base64' })
  logo: string | null;
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
