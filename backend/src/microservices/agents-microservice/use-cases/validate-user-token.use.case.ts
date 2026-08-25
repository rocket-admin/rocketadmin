import { HttpException, Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import Sentry from '@sentry/minimal';
import jwt from 'jsonwebtoken';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { JwtScopesEnum } from '../../../entities/user/enums/jwt-scopes.enum.js';
import { assertTokenScopeAllowed } from '../../../entities/user/utils/assert-token-scope-allowed.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { appConfig } from '../../../shared/config/app-config.js';
import { ValidateUserTokenDs } from '../data-structures/agents.ds.js';
import { ValidatedUserTokenRO } from '../data-structures/agents-responses.ds.js';
import { IValidateUserToken } from './agents-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class ValidateUserTokenUseCase
	extends AbstractUseCase<ValidateUserTokenDs, ValidatedUserTokenRO>
	implements IValidateUserToken
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
	) {
		super();
	}

	protected async implementation(inputData: ValidateUserTokenDs): Promise<ValidatedUserTokenRO> {
		const { token, allowScopes } = inputData;
		// Plan 15 Phase 5: when the caller explicitly accepts the '2fa_enable' scope, validation
		// deliberately MATCHES the core's NonScopedAuthMiddleware semantics EXACTLY (used by the
		// core's own OTP-enrolment routes): the 2fa-scope rejection is skipped AND the suspension
		// check is skipped too — NonScopedAuthMiddleware only verifies signature + logout blacklist,
		// without loading the user at all. Tighten both together if this ever changes.
		const allow2faEnableScope = allowScopes?.includes(JwtScopesEnum.TWO_FA_ENABLE) === true;

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

			if (foundUser.suspended && !allow2faEnableScope) {
				throw new UnauthorizedException(Messages.ACCOUNT_SUSPENDED);
			}

			assertTokenScopeAllowed(data.scope as Array<JwtScopesEnum>, allowScopes);

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
