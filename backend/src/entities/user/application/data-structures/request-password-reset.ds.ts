// Input of RequestResetUserPasswordUseCase. Deliberately a DS the controllers construct field by
// field (never the raw request body): `suppressEmail` must only ever be set by the /saas/*
// microservice bridge — a public caller must not be able to smuggle it in and receive the raw
// reset token (the global ValidationPipe does not strip unknown body properties).
export class RequestPasswordResetDs {
	email: string;
	companyId: string;
	/** Satellite-provided link prefix (see ValidationHelper.resolveEmailVerificationLinkBase). */
	verificationLinkBase?: string;
	/** Bridge-only (plan 15 Phase 2): skip the send and return the email payload instead. */
	suppressEmail?: boolean;
}
