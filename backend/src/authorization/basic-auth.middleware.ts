import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { parse as parseBasicAuth } from 'basic-auth';
import { NextFunction, Request, Response } from 'express';
import { Messages } from '../exceptions/text/messages.js';
import { appConfig } from '../shared/config/app-config.js';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
	use(req: Request, _res: Response, next: NextFunction): void {
		const basicAuthLogin = appConfig.auth.basicAuthLogin;
		const basicAuthPassword = appConfig.auth.basicAuthPassword;
		const authorizationHeader = req.headers.authorization;
		const userCredentials = typeof authorizationHeader === 'string' ? parseBasicAuth(authorizationHeader) : undefined;
		if (!userCredentials) {
			throw new UnauthorizedException(Messages.AUTHORIZATION_REQUIRED);
		}
		const { name: loginUserName, pass: loginUserPassword } = userCredentials;
		if (basicAuthLogin !== loginUserName || basicAuthPassword !== loginUserPassword) {
			throw new UnauthorizedException(Messages.INVALID_USERNAME_OR_PASSWORD);
		} else {
			next();
		}
	}
}
