import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Logger } from '../helpers/logging/Logger.js';
import { processExceptionMessage } from './utils/process-exception-message.js';
import Sentry from '@sentry/minimal';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    let text = exception.message;
    text = processExceptionMessage(text);
    const type = exception?.response?.type;
    const originalMessage = exception?.originalMessage;
    const internalCode = exception?.internalCode;
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const sentryContextObject = {
      extra: {
        original_exception_message: originalMessage,
        message_to_user: text ? text : 'Something went wrong',
        path: request.url,
        exception_status_code: status,
      }
    }
    Sentry.captureException(exception, sentryContextObject);

    if (status === 500 || status === 408) {
      Logger.logError(exception);
    }

    response.status(status).json({
      message: text ? text : 'Something went wrong',
      type: type ? type : undefined,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      originalMessage: originalMessage,
      internalCode: internalCode,
    });
  }
}
