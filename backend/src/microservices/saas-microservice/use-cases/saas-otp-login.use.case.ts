import { Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType, UseCaseType } from '../../../common/data-injection.tokens.js';
import { FoundUserDto } from '../../../entities/user/dto/found-user.dto.js';
import { IOtpLogin } from '../../../entities/user/use-cases/user-use-cases.interfaces.js';
import { UserHelperService } from '../../../entities/user/user-helper.service.js';
import { InTransactionEnum } from '../../../enums/in-transaction.enum.js';
import { appConfig } from '../../../shared/config/app-config.js';
import { SaasOtpLoginDs } from '../data-structures/saas-otp-login.ds.js';
import { ISaasOtpLogin } from './saas-use-cases.interface.js';

/**
 * Completes a 2FA login on behalf of the SaaS control plane (plan 15 Phase 5).
 *
 * The SaaS service cannot verify the temporary token locally (the logout blacklist lives in the
 * core's database), so this bridge replicates the core's TemporaryAuthMiddleware — blacklist check
 * plus jwt.verify against TEMPORARY_JWT_SECRET — and then delegates the OTP verification +
 * sign-in-audit recording to the existing OtpLoginUseCase (its core-signed token is discarded:
 * the SaaS caller signs its own cookie from the returned user, exactly as with the login bridge).
 */
@Injectable({ scope: Scope.REQUEST })
export class SaasOtpLoginUseCase extends AbstractUseCase<SaasOtpLoginDs, FoundUserDto> implements ISaasOtpLogin {
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		@Inject(UseCaseType.OTP_LOGIN)
		private readonly otpLoginUseCase: IOtpLogin,
		private readonly userHelperService: UserHelperService,
	) {
		super();
	}

	protected async implementation(inputData: SaasOtpLoginDs): Promise<FoundUserDto> {
		const { temporaryToken, otpCode, ipAddress, userAgent } = inputData;
		if (!temporaryToken) {
			throw new UnauthorizedException('Token is missing');
		}

		// Mirror TemporaryAuthMiddleware: blacklist first, then verify against the temporary secret.
		const isLoggedOut = await this._dbContext.logOutRepository.isLoggedOut(temporaryToken);
		if (isLoggedOut) {
			throw new UnauthorizedException('JWT verification failed');
		}

		const jwtSecret = appConfig.auth.temporaryJwtSecret;
		if (!jwtSecret) {
			throw new UnauthorizedException('JWT verification failed');
		}

		let userId: string | undefined;
		try {
			const data = jwt.verify(temporaryToken, jwtSecret) as jwt.JwtPayload;
			userId = data.id;
		} catch (_e) {
			throw new UnauthorizedException('JWT verification failed');
		}
		if (!userId) {
			throw new UnauthorizedException('JWT verification failed');
		}

		// Reuse the existing OTP-login use case (OTP verification + sign-in audit); it throws on an
		// invalid code and returns a core-signed token we deliberately discard.
		await this.otpLoginUseCase.execute({ userId, otpToken: otpCode, ipAddress, userAgent }, InTransactionEnum.OFF);

		const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
		if (!foundUser) {
			throw new UnauthorizedException('JWT verification failed');
		}
		return await this.userHelperService.buildFoundUserDs(foundUser);
	}
}
