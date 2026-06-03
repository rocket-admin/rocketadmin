import { HttpStatus } from '@nestjs/common';
import { categorizeExceptionMessage } from '../utils/process-exception-message.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ErrorsMessages } from './messages/custom-errors-messages.js';

export class DeleteRowException extends BaseRocketAdminException {
	constructor(originalMessage: string) {
		const categorized = categorizeExceptionMessage(originalMessage);
		const recognized = categorized.internalCode !== undefined;
		super(recognized ? categorized.message : ErrorsMessages.FAILED_TO_DELETE_ROW, HttpStatus.INTERNAL_SERVER_ERROR, {
			originalMessage,
			internalCode: recognized ? categorized.internalCode : ExceptionsInternalCodes.UNKNOWN_SQL_EXCEPTION,
			type: categorized.type,
		});
	}
}
