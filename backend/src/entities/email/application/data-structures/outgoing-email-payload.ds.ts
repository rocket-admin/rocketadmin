import { ApiProperty } from '@nestjs/swagger';

export type OutgoingEmailPayloadType =
	| 'email_confirmation'
	| 'password_reset_request'
	| 'email_change_request'
	| 'email_changed'
	| 'company_invite';

/**
 * Email context a `/saas/*` bridge returns INSTEAD of sending the letter itself when the caller
 * sets `suppressEmail: true` (plan 15 Phase 2 — trigger inversion). The SaaS control plane builds
 * the final link from `rawToken` and sends the email in-process. The raw token transits exactly
 * one internal HTTPS hop and must never be logged on either side.
 */
export class OutgoingEmailPayloadDs {
	@ApiProperty({
		enum: ['email_confirmation', 'password_reset_request', 'email_change_request', 'email_changed', 'company_invite'],
		description: 'Email type discriminator (matches the SaaS EmailType catalog).',
	})
	type: OutgoingEmailPayloadType;

	@ApiProperty({ description: 'Recipient address.' })
	to: string;

	@ApiProperty({ required: false, description: 'Raw verification token (absent for notice-only letters).' })
	rawToken?: string;

	@ApiProperty({ required: false })
	companyId?: string;

	@ApiProperty({ required: false, nullable: true, type: String })
	companyName?: string | null;
}
