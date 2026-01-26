import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { CONSTANTS } from '../constants/index.js';
import { type TokenPayload, verifyToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

declare module 'hono' {
	interface ContextVariableMap {
		connectionToken: TokenPayload;
	}
}

// biome-ignore lint/suspicious/noConfusingVoidType: Hono middleware returns void
export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
	const authHeader = c.req.header('Authorization');

	if (!authHeader) {
		logger.warn('Missing authorization header');
		throw new HTTPException(403, {
			message: JSON.stringify({
				errors: { body: [CONSTANTS.AUTHORIZATION_FAILED, CONSTANTS.NO_AUTHORIZATION_HEADER] },
			}),
		});
	}

	const token = authHeader.replace('Bearer ', '');

	if (!token) {
		logger.warn('Empty token in authorization header');
		throw new HTTPException(403, {
			message: JSON.stringify({
				errors: { body: [CONSTANTS.AUTHORIZATION_FAILED, CONSTANTS.TOKEN_MISSING] },
			}),
		});
	}

	try {
		const payload = await verifyToken(token);
		logger.info({ payloadToken: payload.token }, 'JWT payload decoded');

		if (!payload.token) {
			throw new Error(CONSTANTS.CONNECTION_TOKEN_MISSING);
		}

		c.set('connectionToken', payload);
		await next();
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		logger.warn({ error: errorMessage }, 'Token verification failed');
		throw new HTTPException(401, {
			message: JSON.stringify({
				errors: { body: [CONSTANTS.AUTHORIZATION_FAILED, errorMessage] },
			}),
		});
	}
}
