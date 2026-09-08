import {
	HttpException,
	Injectable,
	InternalServerErrorException,
	NestMiddleware,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as Sentry from '@sentry/node';
import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { JwtScopesEnum } from '../entities/user/enums/jwt-scopes.enum.js';
import { UserEntity } from '../entities/user/user.entity.js';
import { assertTokenScopeAllowed } from '../entities/user/utils/assert-token-scope-allowed.js';
import { EncryptionAlgorithmEnum } from '../enums/encryption-algorithm.enum.js';
import { Messages } from '../exceptions/text/messages.js';
import { Constants } from '../helpers/constants/constants.js';
import { Encryptor } from '../helpers/encryption/encryptor.js';
import { isObjectEmpty } from '../helpers/is-object-empty.js';
import { appConfig } from '../shared/config/app-config.js';
import { IRequestWithCognitoInfo } from './cognito-decoded.interface.js';

@Injectable()
export class AuthWithApiMiddleware implements NestMiddleware {
	public constructor(
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>,
	) {}

	async use(req: IRequestWithCognitoInfo, _res: Response, next: NextFunction): Promise<void> {
		try {
			await this.authenticateRequest(req);
			next();
		} catch (error) {
			// Capture only what becomes a 500 (plan 30) — see handleAuthenticationError's mapping.
			if (!(error instanceof HttpException || error instanceof UnauthorizedException)) {
				Sentry.captureException(error);
			}
			this.handleAuthenticationError(error);
		}
	}

	private async authenticateRequest(req: IRequestWithCognitoInfo): Promise<void> {
		const tokenFromCookie = this.getTokenFromCookie(req);
		if (tokenFromCookie) {
			await this.authenticateWithToken(tokenFromCookie, req);
		} else {
			await this.authenticateWithApiKey(req);
		}
	}

	private getTokenFromCookie(req: IRequestWithCognitoInfo): string | undefined {
		return req.cookies?.[Constants.JWT_COOKIE_KEY_NAME];
	}

	private handleAuthenticationError(error: any): void {
		if (error instanceof HttpException || error instanceof UnauthorizedException) {
			throw error;
		}
		throw new InternalServerErrorException(Messages.AUTHORIZATION_REJECTED);
	}

	private async authenticateWithToken(tokenFromCookie: string, req: IRequestWithCognitoInfo): Promise<void> {
		// No try/catch here (plan 30): the caller's catch owns both the Sentry capture and the
		// error mapping — the old inner capture double-reported every failure.
		const jwtSecret = appConfig.auth.jwtSecret;
		if (!jwtSecret) {
			throw new UnauthorizedException('JWT verification failed');
		}
		const data = jwt.verify(tokenFromCookie, jwtSecret) as jwt.JwtPayload;
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
	}

	private async authenticateWithApiKey(req: IRequestWithCognitoInfo): Promise<void> {
		let apiKey = req.headers?.['x-api-key'];
		if (Array.isArray(apiKey)) {
			apiKey = apiKey[0];
		}
		if (!apiKey) {
			throw new UnauthorizedException(Messages.NO_AUTH_KEYS_FOUND);
		}
		const apiKeyHash = await Encryptor.processDataWithAlgorithm(apiKey, EncryptionAlgorithmEnum.sha256);
		const foundUserByApiKey = await this.userRepository
			.createQueryBuilder('user')
			.innerJoinAndSelect('user.api_keys', 'api_key')
			.where('api_key.hash = :hash', { hash: apiKeyHash })
			.getOne();

		if (!foundUserByApiKey) {
			throw new NotFoundException(Messages.NO_AUTH_KEYS_FOUND);
		}

		if (foundUserByApiKey.suspended) {
			throw new UnauthorizedException(Messages.API_KEY_SUSPENDED);
		}

		req.decoded = {
			sub: foundUserByApiKey.id,
			email: foundUserByApiKey.email,
		};
	}
}
