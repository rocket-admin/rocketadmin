import { Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { DemoDataService } from '../../../entities/demo-data/demo-data.service.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { ExternalRegistrationProviderEnum } from '../../../entities/user/enums/external-registration-provider.enum.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { SignInMethodEnum } from '../../../entities/user-sign-in-audit/enums/sign-in-method.enum.js';
import { SignInStatusEnum } from '../../../entities/user-sign-in-audit/enums/sign-in-status.enum.js';
import { SignInAuditService } from '../../../entities/user-sign-in-audit/sign-in-audit.service.js';
import { EmailAlreadyRegisteredException } from '../../../exceptions/custom-exceptions/email-already-registered.exception.js';
import { SaasRegisterUserWithGoogleDS } from '../data-structures/sass-register-user-with-google.js';
import { ILoginUserWithGoogle } from './saas-use-cases.interface.js';

@Injectable()
export class LoginWithGoogleUseCase
	extends AbstractUseCase<SaasRegisterUserWithGoogleDS, UserEntity>
	implements ILoginUserWithGoogle
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly demoDataService: DemoDataService,
		private readonly signInAuditService: SignInAuditService,
	) {
		super();
	}

	protected async implementation(inputData: SaasRegisterUserWithGoogleDS): Promise<UserEntity> {
		const { email, name, glidCookieValue, ipAddress, userAgent } = inputData;

		const userData: RegisterUserDs = {
			email: email,
			gclidValue: glidCookieValue,
			password: null,
			isActive: true,
			name: name ? name : null,
		};

		// "Login or create": an existing Google account logs in; otherwise the address must be free
		// across ALL companies and providers (plan 53) — a password or GitHub account with this
		// address is rejected, not silently logged into. Lookup + insert share the registration lock.
		let foundUser: UserEntity;
		let created = false;
		try {
			foundUser = await this._dbContext.userRepository.withRegistrationEmailLock(email, async () => {
				const googleUser = await this._dbContext.userRepository.findOneUserByEmail(
					email,
					ExternalRegistrationProviderEnum.GOOGLE,
				);
				if (googleUser) {
					return googleUser;
				}
				const conflictingUser = await this._dbContext.userRepository.findAnyUserWithEmail(email);
				if (conflictingUser) {
					throw new EmailAlreadyRegisteredException(conflictingUser.externalRegistrationProvider);
				}
				created = true;
				return await this._dbContext.userRepository.saveRegisteringUser(
					userData,
					ExternalRegistrationProviderEnum.GOOGLE,
				);
			});
		} catch (error) {
			if (error instanceof EmailAlreadyRegisteredException) {
				await this.recordSignInAudit(email, null, SignInStatusEnum.FAILED, ipAddress, userAgent, error.message);
			}
			throw error;
		}

		if (!created) {
			if (foundUser.name !== name && name) {
				foundUser.name = name;
				await this._dbContext.userRepository.saveUserEntity(foundUser);
			}
			await this.recordSignInAudit(email, foundUser.id, SignInStatusEnum.SUCCESS, ipAddress, userAgent);
			return foundUser;
		}
		await this.demoDataService.createDemoDataForUser(foundUser.id);
		await this.recordSignInAudit(email, foundUser.id, SignInStatusEnum.SUCCESS, ipAddress, userAgent);
		return foundUser;
	}

	private async recordSignInAudit(
		email: string,
		userId: string | null,
		status: SignInStatusEnum,
		ipAddress: string | undefined,
		userAgent: string | undefined,
		failureReason?: string,
	): Promise<void> {
		try {
			await this.signInAuditService.createSignInAuditRecord({
				email,
				userId: userId ?? undefined,
				status,
				signInMethod: SignInMethodEnum.GOOGLE,
				ipAddress,
				userAgent,
				failureReason,
			});
		} catch (e) {
			console.error('Failed to record sign-in audit:', e);
		}
	}
}
