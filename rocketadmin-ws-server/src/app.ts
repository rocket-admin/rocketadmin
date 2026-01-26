import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { CONSTANTS } from './constants/index.js';
import { executeCommand } from './handlers/command.js';
import { authMiddleware } from './middleware/auth.js';
import { getConnectionsCount } from './services/connections-cache.js';

export function createApp(): Hono {
	const app = new Hono();

	app.use('*', cors());
	app.use('*', honoLogger());

	app.get('/', (c) => {
		return c.json({ status: CONSTANTS.API_IS_RUNNING });
	});

	app.get('/health', (c) => {
		return c.json({
			status: 'healthy',
			connections: getConnectionsCount(),
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
		});
	});

	app.post('/', authMiddleware, executeCommand);

	app.onError((err, c) => {
		const status = 'status' in err ? (err.status as number) : 500;
		const message = err.message || 'Internal Server Error';

		return c.json({ error: message }, status as 400);
	});

	app.notFound((c) => {
		return c.json({ error: 'Not Found' }, 404);
	});

	return app;
}
