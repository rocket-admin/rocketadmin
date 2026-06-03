import { HttpStatus } from '@nestjs/common';
import { Messages } from '../text/messages.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class MasterPasswordIncorrectException extends BaseRocketAdminException {
	constructor() {
		super(Messages.MASTER_PASSWORD_INCORRECT, HttpStatus.BAD_REQUEST, {
			internalCode: ExceptionsInternalCodes.MASTER_PASSWORD_INCORRECT,
			type: 'invalid_master_key',
		});
	}
}
