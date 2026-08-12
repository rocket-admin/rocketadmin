export class ChangeUserEmailDs {
	newEmail: string;
	verificationString: string;
	/** Bridge-only (plan 15 Phase 2): skip the `email_changed` notice and return its payload instead. */
	suppressEmail?: boolean;
}
