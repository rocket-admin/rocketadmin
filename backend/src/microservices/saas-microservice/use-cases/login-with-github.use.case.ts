import { Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { DemoDataService } from '../../../entities/demo-data/demo-data.service.js';
import { RegisterUserDs } from '../../../entities/user/application/data-structures/register-user-ds.js';
import { ExternalRegistrationProviderEnum } from '../../../entities/user/enums/external-registration-provider.enum.js';
import { UserRoleEnum } from '../../../entities/user/enums/user-role.enum.js';
import { UserEntity } from '../../../entities/user/user.entity.js';
import { buildUserGitHubIdentifierEntity } from '../../../entities/user/utils/build-github-identifier-entity.js';
import { SignInMethodEnum } from '../../../entities/user-sign-in-audit/enums/sign-in-method.enum.js';
import { SignInStatusEnum } from '../../../entities/user-sign-in-audit/enums/sign-in-status.enum.js';
import { SignInAuditService } from '../../../entities/user-sign-in-audit/sign-in-audit.service.js';
import { EmailAlreadyRegisteredException } from '../../../exceptions/custom-exceptions/email-already-registered.exception.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { SaasRegisterUserWithGithub } from '../data-structures/saas-register-user-with-github.js';
import { ILoginUserWithGitHub } from './saas-use-cases.interface.js';

@Injectable()
export class LoginUserWithGithubUseCase
	extends AbstractUseCase<SaasRegisterUserWithGithub, UserEntity>
	implements ILoginUserWithGitHub
{
	private readonly logger = new Logger(LoginUserWithGithubUseCase.name);

	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly demoDataService: DemoDataService,
		private readonly signInAuditService: SignInAuditService,
	) {
		super();
	}

	protected async implementation(inputData: SaasRegisterUserWithGithub): Promise<UserEntity> {
		const { email, githubId, glidCookieValue, name, ipAddress, userAgent } = inputData;
		const foundUser: UserEntity = await this._dbContext.userRepository.findOneUserByGitHubId(githubId);
		if (foundUser) {
			if (foundUser.name !== name && name) {
				foundUser.name = name;
			}
			if (foundUser.email !== email) {
				// GitHub reports a new primary address. Following it used to be unconditional, which
				// could hand this row an address another account already owns (plan 53): keep the old
				// one in that case — the login itself is unaffected.
				const addressOwner = await this._dbContext.userRepository.findAnyUserWithEmail(email);
				if (addressOwner) {
					this.logger.warn(
						`GitHub login: user ${foundUser.id} now reports an address owned by user ${addressOwner.id}; keeping the stored address`,
					);
				} else {
					foundUser.email = email;
				}
			}
			await this._dbContext.userRepository.saveUserEntity(foundUser);
			await this.recordSignInAudit(email, foundUser.id, SignInStatusEnum.SUCCESS, ipAddress, userAgent);
			return foundUser;
		}
		const userData: RegisterUserDs = {
			email: email,
			gclidValue: glidCookieValue,
			password: null,
			isActive: true,
			name: name ? name : null,
			role: UserRoleEnum.ADMIN,
		};

		try {
			// A new GitHub identity: the address must be free across ALL companies and providers
			// (plan 53) — a password or Google account with this address is rejected, not doubled.
			const savedUser = await this._dbContext.userRepository.withRegistrationEmailLock(email, async () => {
				const conflictingUser = await this._dbContext.userRepository.findAnyUserWithEmail(email);
				if (conflictingUser) {
					throw new EmailAlreadyRegisteredException(conflictingUser.externalRegistrationProvider);
				}
				return await this._dbContext.userRepository.saveRegisteringUser(
					userData,
					ExternalRegistrationProviderEnum.GITHUB,
				);
			});

			const newUserGitHubIdentifier = buildUserGitHubIdentifierEntity(savedUser, Number(githubId));
			await this._dbContext.userGitHubIdentifierRepository.saveGitHubIdentifierEntity(newUserGitHubIdentifier);

			await this.demoDataService.createDemoDataForUser(savedUser.id);

			await this.recordSignInAudit(email, savedUser.id, SignInStatusEnum.SUCCESS, ipAddress, userAgent);

			return savedUser;
		} catch (error) {
			if (error instanceof EmailAlreadyRegisteredException) {
				await this.recordSignInAudit(email, null, SignInStatusEnum.FAILED, ipAddress, userAgent, error.message);
				throw error;
			}
			await this.recordSignInAudit(
				email,
				null,
				SignInStatusEnum.FAILED,
				ipAddress,
				userAgent,
				Messages.GITHUB_REGISTRATION_FAILED,
			);
			throw new InternalServerErrorException(Messages.GITHUB_REGISTRATION_FAILED);
		}
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
				signInMethod: SignInMethodEnum.GITHUB,
				ipAddress,
				userAgent,
				failureReason,
			});
		} catch (e) {
			console.error('Failed to record sign-in audit:', e);
		}
	}
}
