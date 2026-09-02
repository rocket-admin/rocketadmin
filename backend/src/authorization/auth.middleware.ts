import {
	HttpException,
	Injectable,
	InternalServerErrorException,
	NestMiddleware,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as Sentry from '@sentry/node';
import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { LogOutEntity } from '../entities/log-out/log-out.entity.js';
import { JwtScopesEnum } from '../entities/user/enums/jwt-scopes.enum.js';
import { UserEntity } from '../entities/user/user.entity.js';
import { assertTokenScopeAllowed } from '../entities/user/utils/assert-token-scope-allowed.js';
import { Messages } from '../exceptions/text/messages.js';
import { isTest } from '../helpers/app/is-test.js';
import { Constants } from '../helpers/constants/constants.js';
import { isObjectEmpty } from '../helpers/is-object-empty.js';
import { appConfig } from '../shared/config/app-config.js';
import { IRequestWithCognitoInfo } from './cognito-decoded.interface.js';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
	public constructor(
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>,
		@InjectRepository(LogOutEntity)
		private readonly logOutRepository: Repository<LogOutEntity>,
	) {}
	async use(req: IRequestWithCognitoInfo, _res: Response, next: NextFunction): Promise<void> {
		let token: string | undefined;
		try {
			token = req.cookies[Constants.JWT_COOKIE_KEY_NAME];
		} catch (_e) {
			if (!isTest()) {
				throw new UnauthorizedException('JWT verification failed');
			}
		}

		if (!token) {
			throw new UnauthorizedException('Token is missing');
		}

		const isLoggedOut = !!(await this.logOutRepository.findOne({ where: { jwtToken: token } }));
		if (isLoggedOut) {
			throw new UnauthorizedException('Token is invalid');
		}

		try {
			const jwtSecret = appConfig.auth.jwtSecret;
			if (!jwtSecret) {
				throw new UnauthorizedException('JWT verification failed');
			}
			const data = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
			const userId = data.id;

			if (!userId) {
				throw new UnauthorizedException('JWT verification failed');
			}

			const userExists = await this.userRepository.findOne({ where: { id: userId } });
			if (!userExists) {
				throw new UnauthorizedException('JWT verification failed');
			}

			if (userExists.suspended) {
				throw new UnauthorizedException(Messages.ACCOUNT_SUSPENDED);
			}

			assertTokenScopeAllowed(data.scope as Array<JwtScopesEnum>);

			const payload = {
				sub: userId,
				email: data.email,
				companyId: data.companyId ?? null,
				exp: data.exp,
				iat: data.iat,
			};
			if (!payload || isObjectEmpty(payload)) {
				throw new UnauthorizedException('JWT verification failed');
			}
			req.decoded = payload;
			next();
		} catch (e) {
			if (e instanceof HttpException || e instanceof UnauthorizedException) {
				throw e;
			}
			// Capture only what becomes a 500 (plan 30): expected auth verdicts (401/403 HttpExceptions)
			// are outcomes, not incidents. These captures were silently dropped for as long as the
			// dead @sentry/minimal import was in place; now that they are live again, gate the noise.
			Sentry.captureException(e);
			throw new InternalServerErrorException(Messages.AUTHORIZATION_REJECTED);
		}
	}
}
