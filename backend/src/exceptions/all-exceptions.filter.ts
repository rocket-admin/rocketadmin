import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { WinstonLogger } from '../entities/logging/winston-logger.js';
import { getErrorMessage } from '../helpers/get-error-message.js';
import { ExceptionType } from './custom-exceptions/exception-type.js';
import { translateDomainError } from './domain-errors/translate-domain-error.js';
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
		const effective = translateDomainError(exception) ?? exception;
		let text = getErrorMessage(effective);
		text = processExceptionMessage(text);
		const meta = asRocketadminException(effective);
		const type = meta.type ?? meta.response?.type;
		const originalMessage = meta.originalMessage;
		const internalCode = meta.internalCode;
		const status = effective instanceof HttpException ? effective.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

		if (status >= 500 || status === 408 || !(effective instanceof HttpException)) {
			const requestId = request.headers?.['x-request-id'];
			const generationId = request.headers?.['x-generation-id'];
			const userEmail = request.decoded?.email;
			Sentry.withScope((scope) => {
				if (typeof requestId === 'string' && requestId !== '') {
					scope.setTag('requestId', requestId);
				}
				if (typeof generationId === 'string' && generationId !== '') {
					scope.setTag('generationId', generationId);
				}
				scope.setExtras({
					original_exception_message: originalMessage,
					message_to_user: text ? text : 'Something went wrong',
					path: request.url,
					exception_status_code: status,
					user_email: userEmail ?? 'unknown',
				});
				Sentry.captureException(exception);
			});
		}

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
