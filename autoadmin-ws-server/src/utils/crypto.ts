import { createHmac } from 'node:crypto';
import { config } from '../config.js';

export function hashToken(token: string): string {
	const hmac = createHmac('sha256', config.privateKey);
	hmac.update(token);
	return hmac.digest('hex');
}
