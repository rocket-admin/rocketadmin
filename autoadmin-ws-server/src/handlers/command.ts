import type { Context } from 'hono';
import { nanoid } from 'nanoid';
import { sendCommandToClient } from '../services/connections-cache.js';
import { cacheResponse, responseCache } from '../services/response-cache.js';
import { logger } from '../utils/logger.js';

export async function executeCommand(c: Context): Promise<Response> {
	const connectionToken = c.get('connectionToken');
	const body = await c.req.json();
	const resId = nanoid();

	body.resId = resId;

	logger.info({ resId, operationType: body.operationType, tokenFromJwt: connectionToken.token }, 'Executing command');

	return new Promise<Response>((resolve) => {
		const timeout = setTimeout(() => {
			if (responseCache.has(resId)) {
				responseCache.delete(resId);
				resolve(c.json({ error: 'Request timeout' }, 504));
			}
		}, 600000); // 10 minutes timeout

		const handleResolve = (data: string) => {
			clearTimeout(timeout);
			// Data from agent is already JSON string, pass it through
			resolve(
				new Response(data, {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}),
			);
		};

		const handleReject = (error: Error) => {
			clearTimeout(timeout);
			resolve(c.json({ error: error.message }, 500));
		};

		const handleSendError = (status: number, message: string) => {
			clearTimeout(timeout);
			resolve(c.json({ error: message }, status as 400));
		};

		cacheResponse(resId, handleResolve, handleReject, handleSendError);

		try {
			sendCommandToClient(connectionToken.token, body, resId);
		} catch (error) {
			clearTimeout(timeout);
			responseCache.delete(resId);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger.error({ error: errorMessage, resId }, 'Command execution error');
			resolve(c.json({ error: 'Command execution failed' }, 500));
		}
	});
}
