import { HttpStatus } from '@nestjs/common';
import { Messages } from '../text/messages.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class NonAvailableInFreePlanException extends BaseRocketAdminException {
	constructor(message: string = Messages.FEATURE_NON_AVAILABLE_IN_FREE_PLAN) {
		super(message, HttpStatus.PAYMENT_REQUIRED, {
			internalCode: ExceptionsInternalCodes.FEATURE_NON_AVAILABLE_IN_FREE_PLAN,
		});
	}
}
