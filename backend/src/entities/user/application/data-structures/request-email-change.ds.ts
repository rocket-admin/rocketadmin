export class RequestEmailChangeDs {
	userId: string;
	/** Satellite-provided link prefix (see ValidationHelper.resolveEmailVerificationLinkBase). */
	verificationLinkBase?: string;
}

export class RequestEmailVerificationDs {
	userId: string;
	/** Satellite-provided link prefix (see ValidationHelper.resolveEmailVerificationLinkBase). */
	verificationLinkBase?: string;
}
