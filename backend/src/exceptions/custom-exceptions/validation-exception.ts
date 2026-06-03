import { HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class ValidationException extends BaseRocketAdminException {
	constructor(originalMessage: string | ValidationError[]) {
		if (Array.isArray(originalMessage)) {
			originalMessage = originalMessage
				.map((error) => {
					return `Property "${error.property}" validation failed with following errors: ${Object.values(
						error.constraints ?? {},
					).join(', ')}`;
				})
				.join('.\n');
		}
		super(originalMessage, HttpStatus.BAD_REQUEST, { internalCode: ExceptionsInternalCodes.VALIDATOR_EXCEPTION });
	}
}
