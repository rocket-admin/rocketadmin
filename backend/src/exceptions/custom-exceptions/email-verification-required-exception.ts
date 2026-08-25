import { HttpStatus } from '@nestjs/common';
import { Messages } from '../text/messages.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class EmailVerificationRequiredException extends BaseRocketAdminException {
	constructor() {
		super(Messages.EMAIL_VERIFICATION_REQUIRED, HttpStatus.BAD_REQUEST, {
			internalCode: ExceptionsInternalCodes.EMAIL_VERIFICATION_REQUIRED,
		});
	}
}
