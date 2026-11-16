// Input of RequestResetUserPasswordUseCase. Deliberately a DS that the controllers construct field
// by field (never the raw request body). Only the /saas/* microservice bridge must ever set
// `suppressEmail`. A public caller must not be able to smuggle it in and get the raw reset token.
// The global ValidationPipe does not strip unknown body properties.
export class RequestPasswordResetDs {
	email: string;
	companyId: string;
	/** Satellite-provided link prefix (see ValidationHelper.resolveEmailVerificationLinkBase). */
	verificationLinkBase?: string;
	/** Bridge-only (plan 15 Phase 2): skip the send and return the email payload instead. */
	suppressEmail?: boolean;
}
