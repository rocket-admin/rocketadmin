import { HttpException, Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import Sentry from '@sentry/minimal';
import jwt from 'jsonwebtoken';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { JwtScopesEnum } from '../../../entities/user/enums/jwt-scopes.enum.js';
import { TwoFaRequiredException } from '../../../exceptions/custom-exceptions/two-fa-required-exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { appConfig } from '../../../shared/config/app-config.js';
import { ValidatedUserTokenRO } from '../data-structures/agents-responses.ds.js';
import { IValidateUserToken } from './agents-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class ValidateUserTokenUseCase
	extends AbstractUseCase<string, ValidatedUserTokenRO>
	implements IValidateUserToken
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(token: string): Promise<ValidatedUserTokenRO> {
		if (!token) {
			throw new UnauthorizedException('Token is missing');
		}

		const isLoggedOut = await this._dbContext.logOutRepository.isLoggedOut(token);
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

			const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
			if (!foundUser) {
				throw new UnauthorizedException('JWT verification failed');
			}

			if (foundUser.suspended) {
				throw new UnauthorizedException(Messages.ACCOUNT_SUSPENDED);
			}

			const addedScope: Array<JwtScopesEnum> = data.scope;
			if (addedScope && addedScope.length > 0) {
				if (addedScope.includes(JwtScopesEnum.TWO_FA_ENABLE)) {
					throw new TwoFaRequiredException();
				}
			}

			return {
				sub: userId,
				email: data.email ?? null,
				companyId: data.companyId ?? null,
				exp: data.exp ?? null,
				iat: data.iat ?? null,
			};
		} catch (e) {
			Sentry.captureException(e);
			if (e instanceof HttpException) {
				throw e;
			}
			throw new UnauthorizedException(Messages.AUTHORIZATION_REJECTED);
		}
	}
}
