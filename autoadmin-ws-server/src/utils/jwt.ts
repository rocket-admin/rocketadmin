import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface TokenPayload {
	token: string;
	iat?: number;
	exp?: number;
}

export function signToken(connectionToken: string): Promise<string> {
	return new Promise((resolve, reject) => {
		jwt.sign({ token: connectionToken }, config.jwtSecret, (err: Error | null, token: string | undefined) => {
			if (err) {
				return reject(err);
			}
			if (!token) {
				return reject(new Error('Failed to sign token'));
			}
			return resolve(token);
		});
	});
}

export function verifyToken(token: string): Promise<TokenPayload> {
	return new Promise((resolve, reject) => {
		jwt.verify(token, config.jwtSecret, (err, decoded) => {
			if (err) {
				return reject(err);
			}
			if (!decoded || typeof decoded === 'string') {
				return reject(new Error('Invalid token payload'));
			}
			return resolve(decoded as TokenPayload);
		});
	});
}
