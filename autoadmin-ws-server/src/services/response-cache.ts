import { LRUCache } from 'lru-cache';
import { CACHE_OPTIONS, CONSTANTS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

interface CachedResponse {
	resolve: (data: string) => void;
	reject: (error: Error) => void;
	sendError: (status: number, message: string) => void;
	createdAt: Date;
}

export const responseCache = new LRUCache<string, CachedResponse>({
	max: CACHE_OPTIONS.RESPONSE.max,
	ttl: CACHE_OPTIONS.RESPONSE.ttl,
	dispose: (value, key) => {
		logger.debug({ resId: key }, 'Response cache entry disposed (timeout)');
		value.reject(new Error(CONSTANTS.CONNECTION_TIMEOUT));
	},
});

export function cacheResponse(
	resId: string,
	resolve: (data: string) => void,
	reject: (error: Error) => void,
	sendError: (status: number, message: string) => void,
): void {
	responseCache.set(resId, {
		resolve,
		reject,
		sendError,
		createdAt: new Date(),
	});
	logger.debug({ resId }, 'Response cached');
}

export function getResponse(resId: string): CachedResponse | undefined {
	return responseCache.get(resId);
}

export function deleteResponse(resId: string): void {
	responseCache.delete(resId);
}
