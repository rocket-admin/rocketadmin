export const config = {
	httpPort: Number(process.env.HTTP_PORT) || 8008,
	wsPort: Number(process.env.WS_PORT) || 8009,
	host: process.env.HOST || '0.0.0.0',
	jwtSecret: process.env.JWT_SECRET || '',
	privateKey: process.env.PRIVATE_KEY || '',
	checkConnectionTokenUrl:
		process.env.CHECK_CONNECTION_TOKEN_URL || 'http://autoadmin-internal-auth.local:3000/connection/token',
	logLevel: process.env.LOG_LEVEL || 'silent',
} as const;

export function validateConfig(): void {
	if (!config.jwtSecret) {
		throw new Error('JWT_SECRET environment variable is required');
	}
	if (!config.privateKey) {
		throw new Error('PRIVATE_KEY environment variable is required');
	}
}
