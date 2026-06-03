import { HttpStatus } from '@nestjs/common';
import { categorizeExceptionMessage } from '../utils/process-exception-message.js';
import { BaseRocketAdminException } from './base-rocketadmin.exception.js';
import { ExceptionsInternalCodes } from './custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ExceptionType } from './exception-type.js';

const GENERIC_SQL_MESSAGE =
	'It seems like something went wrong while processing your query. Please try again later or contact our support team.';

export class UnknownSQLException extends BaseRocketAdminException {
	constructor(originalMessage: string, operationType?: string) {
		const { message, internalCode, type } = resolveSqlException(originalMessage);
		const readableMessage = `${operationType ? `${operationType} ` : ''}${message}`;
		super(readableMessage, HttpStatus.INTERNAL_SERVER_ERROR, { originalMessage, internalCode, type });
	}
}

function resolveSqlException(originalMessage: string): {
	message: string;
	internalCode: ExceptionsInternalCodes;
	type?: ExceptionType;
} {
	if (isAgentNoDataError(originalMessage)) {
		return { message: 'No data returned from agent', internalCode: ExceptionsInternalCodes.AGENT_NO_DATA };
	}
	const categorized = categorizeExceptionMessage(originalMessage);
	if (categorized.internalCode !== undefined) {
		return { message: categorized.message, internalCode: categorized.internalCode, type: categorized.type };
	}
	return { message: GENERIC_SQL_MESSAGE, internalCode: ExceptionsInternalCodes.UNKNOWN_SQL_EXCEPTION };
}

function isAgentNoDataError(originalMessage: string): boolean {
	return originalMessage === 'No data returned from agent';
}
