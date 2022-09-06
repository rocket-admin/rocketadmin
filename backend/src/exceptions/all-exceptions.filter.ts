import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { processExceptionMessage } from './utils/process-exception-message';
import { slackPostMessage } from '../helpers';
import { Constants } from '../helpers/constants/constants';
import { Logger } from '../helpers/logging/Logger';

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
    if (status !== 404) {
      try {
        const exceptionToString = `Sent exception message: ${text}
      Sent response status code: ${status}`;
        await slackPostMessage(exceptionToString, Constants.EXCEPTIONS_CHANNELS);
      } catch (e) {
        console.error(e);
      }
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
