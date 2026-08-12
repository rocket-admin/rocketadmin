import { UserRoleEnum } from '../../../user/enums/user-role.enum.js';

export class InviteUserInCompanyAndConnectionGroupDs {
	inviterId: string;
	companyId: string;
	groupId: string | null;
	invitedUserEmail: string;
	invitedUserCompanyRole: UserRoleEnum;
	/** Satellite-provided prefix for the invitation link (already contains the company id in its path). */
	inviteLinkBase?: string;
	/** Satellite-provided prefix for the confirmation link the re-invite branch sends to inactive users. */
	emailVerificationLinkBase?: string;
	/** Bridge-only (plan 15 Phase 2): skip the send(s) and return the email payload instead. */
	suppressEmail?: boolean;
}
