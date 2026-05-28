import jwt from 'jsonwebtoken';
import { appConfig } from '../../../../shared/config/app-config.js';
import { generateRequestId } from './generate-request-id.js';

export function generateSaaSJwt(): string {
	const today = new Date();
	const exp = new Date(today);
	exp.setDate(today.getDate() + 60);
	const secret = appConfig.auth.microserviceJwtSecret;
	if (!secret) {
		throw new Error('Environment variable MICROSERVICE_JWT_SECRET is not set');
	}
	const requestId = generateRequestId();
	return jwt.sign(
		{
			request_id: requestId,
		},
		secret,
	);
}
