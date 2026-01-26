export const CONSTANTS = {
	AUTHORIZATION_FAILED: 'Authorization failed',
	NO_AUTHORIZATION_HEADER: 'No Authorization header',
	TOKEN_MISSING: 'Token missing',
	CONNECTION_TOKEN_MISSING: 'No connection token found',
	CONNECTION_TOKEN_INCORRECT: 'Connection token is incorrect',
	API_IS_RUNNING: 'API is running',
	UNKNOWN_COMMAND: 'Unknown command',
	CLIENT_NOT_CONNECTED: 'Client is not connected',
	CONNECTION_TIMEOUT: 'Connection was closed by timeout',
} as const;

export const CACHE_OPTIONS = {
	WS_CONNECTIONS: {
		max: 5000,
	},
	TOKEN_RESULT: {
		max: 5000,
		ttl: 1000 * 60 * 5, // 5 minutes
	},
	RESPONSE: {
		max: 5000,
		ttl: 600000, // 10 minutes
	},
} as const;
