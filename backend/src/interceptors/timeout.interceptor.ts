import { CallHandler, ExecutionContext, Injectable, NestInterceptor, RequestTimeoutException } from '@nestjs/common';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Messages } from '../exceptions/text/messages.js';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();
		const aiEndpoints = ['/ai/v2/request/', '/ai/v3/request/'];
		const isAIEndpoint = aiEndpoints.some((endpoint) => request.path.startsWith(endpoint));
		const timeoutMs = isAIEndpoint
			? process.env.NODE_ENV !== 'test'
				? 300000
				: 600000
			: process.env.NODE_ENV !== 'test'
				? 15000
				: 200000;

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
