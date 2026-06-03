import { ExceptionsInternalCodes } from '../custom-exceptions/custom-exceptions-internal-codes/exceptions-internal-codes.js';
import { ExceptionType } from '../custom-exceptions/exception-type.js';
import { PROCESSING_MESSAGES_FIND } from './processing-messages-find.js';
import { PROCESSING_MESSAGES_REPLACE } from './processing-messages-replace.js';

export interface CategorizedExceptionMessage {
	message: string;
	internalCode?: ExceptionsInternalCodes;
	type?: ExceptionType;
}

export function categorizeExceptionMessage(message: string): CategorizedExceptionMessage {
	const msgInLowerCase = message.toLowerCase();
	switch (true) {
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.ETIMEDOUT) &&
			msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.AMAZON_HOSTNAME):
			return {
				message: PROCESSING_MESSAGES_REPLACE.ALLOW_CONNECTIONS,
				internalCode: ExceptionsInternalCodes.HOST_UNREACHABLE,
				type: 'host_unreachable',
			};
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.ETIMEDOUT):
			return {
				message: PROCESSING_MESSAGES_REPLACE.getaddrinfo_ENOTFOUND,
				internalCode: ExceptionsInternalCodes.CONNECTION_TIMEOUT,
				type: 'query_timeout',
			};
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.getaddrinfo_ENOTFOUND):
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.ECONNREFUSED):
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.EHOSTUNREACH):
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.ECONNRESET):
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.SERVER_CLOSED):
			return {
				message: PROCESSING_MESSAGES_REPLACE.getaddrinfo_ENOTFOUND,
				internalCode: ExceptionsInternalCodes.HOST_UNREACHABLE,
				type: 'host_unreachable',
			};
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.ORA_02292):
			return {
				message: PROCESSING_MESSAGES_REPLACE.ORA_02292,
				internalCode: ExceptionsInternalCodes.FOREIGN_KEY_VIOLATION,
				type: 'foreign_key_violation',
			};
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.NO_PGHBA_ENTRY):
			return {
				message: PROCESSING_MESSAGES_REPLACE.NO_PGHBA_ENTRY,
				internalCode: ExceptionsInternalCodes.DB_PERMISSION_DENIED,
				type: 'db_permission_denied',
			};
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.UPDATE_COMMAND_DENIED):
			return {
				message: PROCESSING_MESSAGES_REPLACE.UPDATE_COMMAND_DENIED,
				internalCode: ExceptionsInternalCodes.DB_PERMISSION_DENIED,
				type: 'db_permission_denied',
			};
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.VIOLATES_FOREIGN_CONSTRAINT_PG):
			return {
				message: PROCESSING_MESSAGES_REPLACE.VIOLATES_FOREIGN_CONSTRAINT_PG(msgInLowerCase),
				internalCode: ExceptionsInternalCodes.FOREIGN_KEY_VIOLATION,
				type: 'foreign_key_violation',
			};
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.VIOLATES_FOREIGN_CONSTRAINT_MYSQL):
			return {
				message: PROCESSING_MESSAGES_REPLACE.VIOLATES_FOREIGN_CONSTRAINT_MYSQL(msgInLowerCase),
				internalCode: ExceptionsInternalCodes.FOREIGN_KEY_VIOLATION,
				type: 'foreign_key_violation',
			};
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.VIOLATES_FOREIGN_CONSTRAINT_MSSQL):
			return {
				message: PROCESSING_MESSAGES_REPLACE.VIOLATES_FOREIGN_CONSTRAINT_MSSQL(msgInLowerCase),
				internalCode: ExceptionsInternalCodes.FOREIGN_KEY_VIOLATION,
				type: 'foreign_key_violation',
			};
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.SELECT_COMMAND_DENIED_MYSQL):
			return {
				message: PROCESSING_MESSAGES_REPLACE.SELECT_COMMAND_DENIED_MYSQL(msgInLowerCase),
				internalCode: ExceptionsInternalCodes.DB_PERMISSION_DENIED,
				type: 'db_permission_denied',
			};
		case msgInLowerCase.includes(PROCESSING_MESSAGES_FIND.Malformed_UTF_data):
			return {
				message: PROCESSING_MESSAGES_REPLACE.Malformed_UTF_data,
				internalCode: ExceptionsInternalCodes.DECRYPTION_FAILED,
				type: 'decryption_failed',
			};
		default:
			return { message };
	}
}

export function processExceptionMessage(message: string): string {
	return categorizeExceptionMessage(message).message;
}
