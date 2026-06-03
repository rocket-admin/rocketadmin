import { HttpStatus } from '@nestjs/common';
import { Messages } from '../text/messages.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class PrimaryKeyMissingException extends BaseRocketAdminException {
	constructor(message: string = Messages.PRIMARY_KEY_MISSING) {
		super(message, HttpStatus.BAD_REQUEST, {
			internalCode: ExceptionsInternalCodes.PRIMARY_KEY_MISSING,
		});
	}
}
