import { LRUCache } from 'lru-cache';
import { config } from '../config.js';
import { CACHE_OPTIONS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

const tokenCache = new LRUCache<string, boolean>({
	max: CACHE_OPTIONS.TOKEN_RESULT.max,
	ttl: CACHE_OPTIONS.TOKEN_RESULT.ttl,
});

export async function validateConnectionToken(connectionToken: string): Promise<boolean> {
	if (!connectionToken) {
		return false;
	}

	const cachedResult = tokenCache.get(connectionToken);
	if (cachedResult !== undefined) {
		logger.debug({ connectionToken: `${connectionToken.substring(0, 8)}...` }, 'Token validation from cache');
		return cachedResult;
	}

	try {
		const checkUrl = `${config.checkConnectionTokenUrl}?token=${connectionToken}`;

		const response = await fetch(checkUrl);

		if (response.status !== 200) {
			logger.warn({ status: response.status }, 'Token validation failed');
			return false;
		}

		const data = (await response.json()) as { isValid?: boolean };
		const isValid = !!data.isValid;

		if (isValid) {
			tokenCache.set(connectionToken, true);
		}

		return isValid;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		logger.error({ error: errorMessage }, 'Error validating connection token');
		return false;
	}
}
