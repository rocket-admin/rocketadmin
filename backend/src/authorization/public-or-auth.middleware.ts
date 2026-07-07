import {
	HttpException,
	Injectable,
	InternalServerErrorException,
	NestMiddleware,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Sentry from '@sentry/minimal';
import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { JwtScopesEnum } from '../entities/user/enums/jwt-scopes.enum.js';
import { UserEntity } from '../entities/user/user.entity.js';
import { EncryptionAlgorithmEnum } from '../enums/encryption-algorithm.enum.js';
import { TwoFaRequiredException } from '../exceptions/custom-exceptions/two-fa-required-exception.js';
import { Messages } from '../exceptions/text/messages.js';
import { Constants } from '../helpers/constants/constants.js';
import { Encryptor } from '../helpers/encryption/encryptor.js';
import { isObjectEmpty } from '../helpers/is-object-empty.js';
import { appConfig } from '../shared/config/app-config.js';
import { IRequestWithCognitoInfo } from './cognito-decoded.interface.js';

/**
 * Authentication middleware that ALSO allows anonymous ("public") requests through.
 *
 * - A JWT cookie or an `x-api-key` header is authenticated exactly like AuthWithApiMiddleware and
 *   populates `req.decoded`.
 * - When neither is present, the request is treated as public: `req.decoded` is left empty and the
 *   request continues. Downstream guards then decide whether the connection's public policy grants
 *   access. An invalid/expired credential still fails fast.
 *
 * This is applied only to read-capable pure CRUD routes; write routes keep AuthWithApiMiddleware.
 */
@Injectable()
export class PublicOrAuthMiddleware implements NestMiddleware {
	public constructor(
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>,
	) {}

	async use(req: IRequestWithCognitoInfo, _res: Response, next: NextFunction): Promise<void> {
		try {
			const tokenFromCookie = req.cookies?.[Constants.JWT_COOKIE_KEY_NAME];
			let apiKey = req.headers?.['x-api-key'];
			if (Array.isArray(apiKey)) {
				apiKey = apiKey[0];
			}

			if (tokenFromCookie) {
				await this.authenticateWithToken(tokenFromCookie, req);
			} else if (apiKey) {
				await this.authenticateWithApiKey(apiKey, req);
			} else {
				req.decoded = {};
			}
			next();
		} catch (error) {
			Sentry.captureException(error);
			if (error instanceof HttpException || error instanceof UnauthorizedException) {
				throw error;
			}
			throw new InternalServerErrorException(Messages.AUTHORIZATION_REJECTED);
		}
	}

	private async authenticateWithToken(tokenFromCookie: string, req: IRequestWithCognitoInfo): Promise<void> {
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

		const addedScope: Array<JwtScopesEnum> = data.scope;
		if (addedScope && addedScope.length > 0) {
			if (addedScope.includes(JwtScopesEnum.TWO_FA_ENABLE)) {
				throw new TwoFaRequiredException();
			}
		}

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

	private async authenticateWithApiKey(apiKey: string, req: IRequestWithCognitoInfo): Promise<void> {
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
