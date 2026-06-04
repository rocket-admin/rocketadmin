import { HttpStatus } from '@nestjs/common';
import { Messages } from '../text/messages.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class ConnectionNotFoundException extends BaseRocketAdminException {
	constructor(status: HttpStatus = HttpStatus.NOT_FOUND) {
		super(Messages.CONNECTION_NOT_FOUND, status, {
			internalCode: ExceptionsInternalCodes.CONNECTION_NOT_FOUND,
		});
	}
}
