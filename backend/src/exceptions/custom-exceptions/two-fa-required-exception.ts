import { HttpStatus } from '@nestjs/common';
import { Messages } from '../text/messages.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';

export class TwoFaRequiredException extends BaseRocketAdminException {
	constructor() {
		super(Messages.TWO_FA_REQUIRED, HttpStatus.BAD_REQUEST, {
			internalCode: ExceptionsInternalCodes.TWO_FA_REQUIRED,
		});
	}
}
