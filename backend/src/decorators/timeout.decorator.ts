import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { TimeoutInterceptor } from '../interceptors/timeout.interceptor.js';

export const TIMEOUT_KEY = 'custom_timeout';

export const TimeoutDefaults = {
	DEFAULT: 15000,
	DEFAULT_TEST: 200000,
	EXTENDED: 60000,
	EXTENDED_TEST: 300000,
	AI: 300000,
	AI_TEST: 600000,
} as const;

export function Timeout(timeoutMs?: number): MethodDecorator & ClassDecorator {
	return applyDecorators(SetMetadata(TIMEOUT_KEY, timeoutMs), UseInterceptors(TimeoutInterceptor));
}
