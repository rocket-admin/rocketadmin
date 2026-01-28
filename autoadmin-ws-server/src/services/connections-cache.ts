import { LRUCache } from 'lru-cache';
import type WebSocket from 'ws';
import { CACHE_OPTIONS, CONSTANTS } from '../constants/index.js';
import { logger } from '../utils/logger.js';
import { responseCache } from './response-cache.js';

interface CachedConnection {
	ws: WebSocket;
	connectedAt: Date;
}

const connectionsCache = new LRUCache<string, CachedConnection>({
	max: CACHE_OPTIONS.WS_CONNECTIONS.max,
});

export function cacheConnection(connectionToken: string, ws: WebSocket): void {
	connectionsCache.set(connectionToken, {
		ws,
		connectedAt: new Date(),
	});
	logger.debug({ connectionToken: `${connectionToken.substring(0, 8)}...` }, 'Connection cached');
}

export function getConnection(connectionToken: string): CachedConnection | undefined {
	return connectionsCache.get(connectionToken);
}

export function deleteConnection(connectionToken: string): void {
	connectionsCache.delete(connectionToken);
	logger.debug({ connectionToken: `${connectionToken.substring(0, 8)}...` }, 'Connection removed from cache');
}

export function sendCommandToClient(connectionToken: string, data: unknown, resId: string): void {
	const cached = connectionsCache.get(connectionToken);
	const payload = {
		connectionToken,
		data,
	};

	logger.info(
		{
			token: `${connectionToken.substring(0, 8)}...`,
			cacheSize: connectionsCache.size,
			found: !!cached,
		},
		'Looking up connection',
	);

	if (!cached) {
		logger.warn({ connectionToken: `${connectionToken.substring(0, 8)}...` }, 'No cached connection found');
		const cachedResponse = responseCache.get(resId);
		if (cachedResponse) {
			cachedResponse.sendError(523, CONSTANTS.CLIENT_NOT_CONNECTED);
			responseCache.delete(resId);
		}
		return;
	}

	const { ws } = cached;

	if (ws.readyState !== ws.OPEN) {
		logger.warn({ connectionToken: `${connectionToken.substring(0, 8)}...` }, 'WebSocket not in OPEN state');
		connectionsCache.delete(connectionToken);
		const cachedResponse = responseCache.get(resId);
		if (cachedResponse) {
			cachedResponse.sendError(523, CONSTANTS.CLIENT_NOT_CONNECTED);
			responseCache.delete(resId);
		}
		return;
	}

	try {
		ws.send(JSON.stringify(payload));
		logger.debug({ resId }, 'Command sent to client');
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		logger.error({ error: errorMessage }, 'Error sending command to client');
	}
}

export function getConnectionsCount(): number {
	return connectionsCache.size;
}
