import { ApiProperty } from '@nestjs/swagger';
import { OutgoingEmailPayloadDs } from '../../../email/application/data-structures/outgoing-email-payload.ds.js';
import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';

export class InvitedUserInCompanyAndConnectionGroupDs {
	@ApiProperty()
	companyId: string;

	@ApiProperty({ nullable: true, type: String })
	groupId: string | null;

	@ApiProperty()
	email: string;

	@ApiProperty({ enum: UserRoleEnum })
	role: UserRoleEnum;

	// Present only when the /saas/* bridge caller set `suppressEmail: true` (plan 15 Phase 2).
	@ApiProperty({ required: false, type: OutgoingEmailPayloadDs })
	emailPayload?: OutgoingEmailPayloadDs;

	// suppressEmail-only: the invited address belongs to an existing-but-inactive user, so no
	// invitation was created — the payload above is a re-confirmation letter instead. Returned as
	// a marked success (not thrown) because the global exception filter serializes a fixed shape
	// and would strip the payload from an error body; the SaaS caller translates this back into
	// the user-facing 400 after sending the letter.
	@ApiProperty({ required: false })
	userAlreadyAddedInactive?: boolean;
}
