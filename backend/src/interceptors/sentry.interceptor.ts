import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import Sentry from '@sentry/minimal';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    try {
      const contextArgs = context.getArgs();
      const userEmail = contextArgs[0]?.decoded?.email;
      const receivedConnectionHost = contextArgs[0]?.body?.host;
      return next.handle().pipe(
        tap(null, async (exception) => {
          Sentry.setContext('user_email', {
            email: userEmail ? userEmail : 'unknown',
          });
          if (receivedConnectionHost) {
            Sentry.setContext('received_connection_hostname', {
              hostname: receivedConnectionHost,
            });
          }
          if (exception.originalMessage) {
            Sentry.setContext('original_exception_message', {
              originalMessage: exception.originalMessage,
            });
          }
          Sentry.captureException(exception);
        }),
      );
    } catch (e) {
      console.error(e);
    }
  }
}
