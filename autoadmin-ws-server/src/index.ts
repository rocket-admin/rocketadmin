import { createServer } from 'node:http';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { config, validateConfig } from './config.js';
import { setupWebSocketServer } from './handlers/websocket.js';
import { logger } from './utils/logger.js';

try {
	validateConfig();
} catch (error) {
	const message = error instanceof Error ? error.message : 'Configuration error';
	logger.fatal({ error: message }, 'Failed to validate configuration');
	process.exit(1);
}

const app = createApp();

const httpServer = serve({
	fetch: app.fetch,
	port: config.httpPort,
	hostname: config.host,
});

logger.info({ host: config.host, port: config.httpPort }, 'HTTP server started');

const wsHttpServer = createServer((_req, res) => {
	res.writeHead(200);
	res.end();
});

const wss = setupWebSocketServer(wsHttpServer);

wsHttpServer.listen(config.wsPort, () => {
	logger.info({ port: config.wsPort }, 'WebSocket server started');
});

const shutdown = (signal: string) => {
	logger.info({ signal }, 'Shutdown signal received');

	wss.close(() => {
		logger.info('WebSocket server closed');
	});

	wsHttpServer.close(() => {
		logger.info('WebSocket HTTP server closed');
	});

	httpServer.close(() => {
		logger.info('HTTP server closed');
	});

	setTimeout(() => {
		logger.info('Forcing shutdown');
		process.exit(0);
	}, 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
	logger.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
	process.exit(1);
});

process.on('unhandledRejection', (reason) => {
	logger.error({ reason }, 'Unhandled rejection');
});

export { app, httpServer, wss };
