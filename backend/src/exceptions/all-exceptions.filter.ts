import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import Sentry from '@sentry/minimal';
import { WinstonLogger } from '../entities/logging/winston-logger.js';
import { getErrorMessage } from '../helpers/get-error-message.js';
import { ExceptionType } from './custom-exceptions/exception-type.js';
import { Messages } from './text/messages.js';
import { processExceptionMessage } from './utils/process-exception-message.js';

export { ExceptionType };

interface RocketadminException {
	type?: ExceptionType;
	response?: { type?: ExceptionType };
	originalMessage?: string;
	internalCode?: string | number;
}

function asRocketadminException(exception: unknown): RocketadminException {
	if (exception && typeof exception === 'object') {
		return exception as RocketadminException;
	}
	return {};
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	constructor(private readonly logger: WinstonLogger) {}
	async catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse();
		const request = ctx.getRequest();
		let text = getErrorMessage(exception);
		text = processExceptionMessage(text);
		const meta = asRocketadminException(exception);
		const type = meta.type ?? meta.response?.type;
		const originalMessage = meta.originalMessage;
		const internalCode = meta.internalCode;
		const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
		const sentryContextObject = {
			extra: {
				original_exception_message: originalMessage,
				message_to_user: text ? text : 'Something went wrong',
				path: request.url,
				exception_status_code: status,
			},
		};
		Sentry.captureException(exception, sentryContextObject);

		if (status === 500 || status === 408) {
			this.logger.error(exception);
		}

		const customExceptionType = this.getErrorType(text);

		response.status(status).json({
			message: text ? text : 'Something went wrong',
			type: type ? type : customExceptionType,
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
			originalMessage: originalMessage,
			internalCode: internalCode,
		});
	}

	private getErrorType(errorText: string): ExceptionType | undefined {
		const ifErrorMasterPwdMissing = errorText === Messages.MASTER_PASSWORD_MISSING;
		const ifErrorMasterPwdIncorrect = errorText === Messages.MASTER_PASSWORD_INCORRECT;
		const ifTimeOutError = errorText.toLowerCase().includes('timeout');

		if (ifErrorMasterPwdMissing) {
			return 'no_master_key';
		}
		if (ifErrorMasterPwdIncorrect) {
			return 'invalid_master_key';
		}
		if (ifTimeOutError) {
			return 'query_timeout';
		}
		return undefined;
	}
}
