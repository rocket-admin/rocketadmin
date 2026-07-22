import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Messages } from '../exceptions/text/messages.js';
import { appConfig } from '../shared/config/app-config.js';
import { IRequestWithCognitoInfo } from './cognito-decoded.interface.js';
import { extractTokenFromHeader } from './utils/extract-token-from-header.js';

@Injectable()
export class SaaSAuthMiddleware implements NestMiddleware {
	use(req: IRequestWithCognitoInfo, _res: Response, next: NextFunction): void {
		console.log(`saas auth middleware triggered ->: ${new Date().toISOString()}`);
		const token = extractTokenFromHeader(req);
		if (!token) {
			throw new UnauthorizedException('Token is missing');
		}
		try {
			const jwtSecret = appConfig.auth.microserviceJwtSecret;
			if (!jwtSecret) {
				throw new UnauthorizedException(Messages.AUTHORIZATION_REJECTED);
			}
			const data = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
			const requestId = data.request_id;

			if (!requestId) {
				throw new UnauthorizedException(Messages.AUTHORIZATION_REJECTED);
			}

			req.decoded = data;
			// Mark the request as an internal service-to-service call so the global
			// throttler skips it (see ThrottlerModule `skipIf` in app.module).
			req.isMicroserviceRequest = true;
			next();
		} catch (_e) {
			throw new UnauthorizedException(Messages.AUTHORIZATION_REJECTED);
		}
	}
}
