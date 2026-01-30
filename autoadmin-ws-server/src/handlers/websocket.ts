import type { Server } from 'node:http';
import WebSocket, { WebSocketServer } from 'ws';
import { COMMAND_TYPE } from '../constants/command-type.js';
import { CONSTANTS } from '../constants/index.js';
import type { WsMessage } from '../schemas/command.js';
import { cacheConnection, deleteConnection, getConnection } from '../services/connections-cache.js';
import { responseCache } from '../services/response-cache.js';
import { validateConnectionToken } from '../services/token-validator.js';
import { hashToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

export function setupWebSocketServer(server: Server): WebSocketServer {
	const wss = new WebSocketServer({ server });

	wss.on('connection', (ws, req) => {
		const ip = req.socket.remoteAddress;
		logger.info({ ip }, 'New WebSocket connection');

		ws.on('message', async (rawMessage) => {
			let data: WsMessage;

			try {
				data = JSON.parse(rawMessage.toString());
			} catch (_error) {
				logger.warn('Failed to parse WebSocket message');
				return;
			}

			const { operationType, resId } = data;
			let { connectionToken } = data;

			if (connectionToken && operationType === COMMAND_TYPE.initialConnection) {
				logger.info({ connectionToken: `${connectionToken.substring(0, 8)}...` }, 'Initial connection received');
				const isValid = await validateConnectionToken(connectionToken);

				if (!isValid) {
					logger.warn({ connectionToken: `${connectionToken.substring(0, 8)}...` }, 'Invalid connection token');
					ws.close(1003, CONSTANTS.CONNECTION_TOKEN_INCORRECT);
					return;
				}

				const hashedToken = hashToken(connectionToken);
				logger.info(
					{ rawToken: `${connectionToken.substring(0, 8)}...`, hashedToken: `${hashedToken.substring(0, 8)}...` },
					'Token validated and hashed',
				);
				connectionToken = hashedToken;
				data.connectionToken = connectionToken;
			}

			if (operationType === COMMAND_TYPE.dataFromAgent && resId) {
				const cachedResponse = responseCache.get(resId);

				if (cachedResponse) {
					logger.debug({ resId }, 'Received data from agent');
					cachedResponse.resolve(rawMessage.toString());
					responseCache.delete(resId);
				}
				return;
			}

			if (!connectionToken) {
				logger.warn('Message received without connection token');
				return;
			}

			const cachedConnection = getConnection(connectionToken);

			if (!cachedConnection) {
				cacheConnection(connectionToken, ws);
			} else if (cachedConnection.ws.readyState !== WebSocket.OPEN) {
				deleteConnection(connectionToken);
				cacheConnection(connectionToken, ws);
			}
		});

		ws.on('close', (code, reason) => {
			logger.info({ ip, code, reason: reason.toString() }, 'WebSocket connection closed');
		});

		ws.on('error', (error) => {
			logger.error({ ip, error: error.message }, 'WebSocket error');
		});
	});

	wss.on('error', (error) => {
		logger.error({ error: error.message }, 'WebSocket server error');
	});

	return wss;
}
