export class RequestEmailChangeDs {
	userId: string;
	/** Satellite-provided link prefix (see ValidationHelper.resolveEmailVerificationLinkBase). */
	verificationLinkBase?: string;
	/** Bridge-only (plan 15 Phase 2): skip the send and return the email payload instead. */
	suppressEmail?: boolean;
}

export class RequestEmailVerificationDs {
	userId: string;
	/** Satellite-provided link prefix (see ValidationHelper.resolveEmailVerificationLinkBase). */
	verificationLinkBase?: string;
	/** Bridge-only (plan 15 Phase 2): skip the send and return the email payload instead. */
	suppressEmail?: boolean;
}
