import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

// Passthrough since plan 30. This interceptor once captured its controller exceptions,
// and each error was ALSO captured by the global AllExceptionsFilter, which sees every exception
// on every route. The interceptor used the deprecated @sentry/minimal v6 API, whose hub the
// @sentry/node v10 client never wires. So its captures were silently dropped for as long as both
// packages coexisted. The filter is now the single (working) capture point, with the request context
// attached inside a per-event scope. The class stays so the existing
// @UseInterceptors(SentryInterceptor) decorators keep compiling; remove them at leisure.
@Injectable()
export class SentryInterceptor implements NestInterceptor {
	intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
		return next.handle();
	}
}
