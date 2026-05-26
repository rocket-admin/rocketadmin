import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import auth from 'basic-auth';
import { Request, Response } from 'express';
import { Messages } from '../exceptions/text/messages.js';
import { appConfig } from '../shared/config/app-config.js';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
	use(req: Request, _res: Response, next: (err?: any, res?: any) => void): void {
		const basicAuthLogin = appConfig.auth.basicAuthLogin;
		const basicAuthPassword = appConfig.auth.basicAuthPassword;
		const userCredentials = auth(req);
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
