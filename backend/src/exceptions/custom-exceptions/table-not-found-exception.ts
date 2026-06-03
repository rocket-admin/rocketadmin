import { HttpStatus } from '@nestjs/common';
import { Messages } from '../text/messages.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class TableNotFoundException extends BaseRocketAdminException {
	constructor() {
		super(Messages.TABLE_NOT_FOUND, HttpStatus.BAD_REQUEST, {
			internalCode: ExceptionsInternalCodes.TABLE_NOT_FOUND,
		});
	}
}
