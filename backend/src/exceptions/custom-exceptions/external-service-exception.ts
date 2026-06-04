import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

/**
 * Raised when an external dependency (the SaaS gateway, the agent, ...) returns an error.
 * The upstream HTTP status is preserved, and the upstream message — when available — is
 * surfaced under `originalMessage`.
 */
export class ExternalServiceException extends BaseRocketAdminException {
	constructor(message: string, status: number, originalMessage?: string) {
		super(message, status, {
			internalCode: ExceptionsInternalCodes.EXTERNAL_SERVICE_ERROR,
			originalMessage,
		});
	}
}
