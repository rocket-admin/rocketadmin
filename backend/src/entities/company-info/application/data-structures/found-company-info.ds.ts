import { ApiProperty } from '@nestjs/swagger';
import { FoundSimpleConnectionInfoDS } from '../../../connection/application/data-structures/found-connections.ds.js';
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
	is2faEnabled?: boolean;

	@ApiProperty()
	show_test_connections: boolean;

	// Custom domains were retired with plan 46 (2026-09); always null, kept for API compatibility.
	@ApiProperty({ required: false, nullable: true })
	custom_domain: string | null;
}

export class FoundUserFullCompanyInfoDs extends FoundUserCompanyInfoDs {
	@ApiProperty({ isArray: true })
	connections: Array<FoundSimpleConnectionInfoDS>;

	@ApiProperty({ isArray: true, type: FoundInvitationInCompanyDs })
	invitations: Array<FoundInvitationInCompanyDs>;
}

export class FoundUserEmailCompaniesInfoDs {
	@ApiProperty()
	id: string;

	@ApiProperty({ required: false })
	name?: string;
}
