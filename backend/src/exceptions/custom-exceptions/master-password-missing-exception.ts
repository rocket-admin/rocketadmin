import { HttpStatus } from '@nestjs/common';
import { Messages } from '../text/messages.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class MasterPasswordMissingException extends BaseRocketAdminException {
	constructor() {
		super(Messages.MASTER_PASSWORD_MISSING, HttpStatus.BAD_REQUEST, {
			internalCode: ExceptionsInternalCodes.MASTER_PASSWORD_MISSING,
			type: 'no_master_key',
		});
	}
}
