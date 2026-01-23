import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { TIMEOUT_KEY, TimeoutDefaults } from '../decorators/timeout.decorator.js';
import { Messages } from '../exceptions/text/messages.js';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
	constructor(private readonly reflector: Reflector) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const customTimeout = this.reflector.getAllAndOverride<number | undefined>(TIMEOUT_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		const defaultTimeout = process.env.NODE_ENV !== 'test' ? TimeoutDefaults.DEFAULT : TimeoutDefaults.DEFAULT_TEST;

		const timeoutMs = customTimeout ?? defaultTimeout;

		return next.handle().pipe(
			timeout(timeoutMs),
			catchError((err) => {
				if (err instanceof TimeoutError) {
					return throwError(
						() =>
							new RequestTimeoutException({
								message: Messages.CONNECTION_TIMED_OUT,
							}),
					);
				}
				return throwError(() => err);
			}),
		);
	}
}
