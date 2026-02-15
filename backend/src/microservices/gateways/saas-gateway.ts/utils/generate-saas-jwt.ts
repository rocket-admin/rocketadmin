import jwt from 'jsonwebtoken';
import { getRequiredEnvVariable } from '../../../../helpers/app/get-requeired-env-variable.js';
import { generateRequestId } from './generate-request-id.js';

export function generateSaaSJwt(): string {
	const today = new Date();
	const exp = new Date(today);
	exp.setDate(today.getDate() + 60);
	const secret = getRequiredEnvVariable('MICROSERVICE_JWT_SECRET');
	const requestId = generateRequestId();
	return jwt.sign(
		{
			request_id: requestId,
		},
		secret,
	);
}
