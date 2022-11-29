import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Logger } from '../helpers/logging/Logger';
import { processExceptionMessage } from './utils/process-exception-message';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    let text = exception.message;
    text = processExceptionMessage(text);
    const type = exception?.response?.type;

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status === 500 || status === 408) {
      Logger.logError(exception);
    }

    response.status(status).json({
      message: text ? text : 'Something went wrong',
      type: type ? type : undefined,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
