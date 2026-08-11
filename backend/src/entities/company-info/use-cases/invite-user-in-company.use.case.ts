import { HttpException, HttpStatus, Inject, Injectable, Scope } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { isTest } from '../../../helpers/app/is-test.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { EmailService } from '../../email/email/email.service.js';
import { WinstonLogger } from '../../logging/winston-logger.js';
import { InviteUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invite-user-in-company-and-connection-group.ds.js';
import { InvitedUserInCompanyAndConnectionGroupDs } from '../application/data-structures/invited-user-in-company-and-connection-group.ds.js';
import { CompanyInfoHelperService } from '../company-info-helper.service.js';
import { IInviteUserInCompanyAndConnectionGroup } from './company-info-use-cases.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class InviteUserInCompanyAndConnectionGroupUseCase
	extends AbstractUseCase<InviteUserInCompanyAndConnectionGroupDs, InvitedUserInCompanyAndConnectionGroupDs>
	implements IInviteUserInCompanyAndConnectionGroup
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
		private readonly emailService: EmailService,
		private readonly companyInfoHelperService: CompanyInfoHelperService,
		private readonly logger: WinstonLogger,
	) {
		super();
	}

	protected async implementation(
		inputData: InviteUserInCompanyAndConnectionGroupDs,
	): Promise<InvitedUserInCompanyAndConnectionGroupDs> {
		const { inviterId, companyId, groupId, invitedUserCompanyRole } = inputData;
		const invitedUserEmail = inputData.invitedUserEmail.toLowerCase();
		const foundCompany = await this._dbContext.companyInfoRepository.findOneBy({ id: companyId });
		if (!foundCompany) {
			throw new HttpException(
				{
					message: Messages.COMPANY_NOT_FOUND,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		if (isSaaS()) {
			const canInviteMoreUsers = await this.companyInfoHelperService.canInviteMoreUsers(companyId);
			if (!canInviteMoreUsers) {
				throw new HttpException(
					{
						message: Messages.MAXIMUM_INVITATIONS_COUNT_REACHED_CANT_INVITE,
					},
					HttpStatus.BAD_REQUEST,
				);
			}
		}

		const foundInvitedUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(
			invitedUserEmail,
			companyId,
		);

		if (foundInvitedUser?.isActive) {
			throw new HttpException(
				{
					message: Messages.USER_ALREADY_ADDED_IN_COMPANY,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		if (foundInvitedUser && !foundInvitedUser.isActive) {
			// Trigger inversion (plan 15 Phase 2): with `suppressEmail` (bridge-only) the re-confirmation
			// letter is NOT sent here — the raw token travels back as a MARKED SUCCESS (the global
			// exception filter would strip extra fields from an error body) and the SaaS caller sends
			// the letter, then surfaces the user-facing 400 itself. Never log the raw token here.
			if (inputData.suppressEmail) {
				const { rawToken: suppressedRawToken } =
					await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(foundInvitedUser);
				return {
					companyId,
					groupId: groupId ?? null,
					email: foundInvitedUser.email,
					role: invitedUserCompanyRole,
					userAlreadyAddedInactive: true,
					emailPayload: {
						type: 'email_confirmation',
						to: foundInvitedUser.email,
						rawToken: suppressedRawToken,
						companyId,
					},
				};
			}

			const { rawToken } =
				await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(foundInvitedUser);

			if (isSaaS()) {
				const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(companyId);
				await this.emailService.sendEmailConfirmation(
					foundInvitedUser.email,
					rawToken,
					companyCustomDomain,
					ValidationHelper.resolveEmailVerificationLinkBase(inputData.emailVerificationLinkBase),
				);
			} else {
				// Plan 15 Phase 6 (rev 5): self-hosted sends no email — the admin takes the full
				// confirmation link from the server logs and hands it to the user.
				this.logger.printTechString(
					`Email confirmation link: ${Constants.APP_DOMAIN_ADDRESS}/external/user/email/verify/${rawToken}`,
				);
			}
			throw new HttpException(
				{
					message: Messages.USER_ALREADY_ADDED_BUT_NOT_ACTIVE_IN_COMPANY,
				},
				HttpStatus.BAD_REQUEST,
			);
		}

		const { rawToken } = await this._dbContext.invitationInCompanyRepository.createOrUpdateInvitationInCompany(
			foundCompany,
			groupId,
			inviterId,
			invitedUserEmail,
			invitedUserCompanyRole,
		);
		const invitationRO: InvitedUserInCompanyAndConnectionGroupDs & { verificationString?: string } = {
			companyId: companyId,
			groupId: groupId,
			email: invitedUserEmail,
			role: invitedUserCompanyRole,
		};

		// Trigger inversion (plan 15 Phase 2): the SaaS caller builds the invite link and sends the
		// letter itself — return the raw token instead of sending (and never log it).
		if (inputData.suppressEmail) {
			invitationRO.emailPayload = {
				type: 'company_invite',
				to: invitedUserEmail,
				rawToken,
				companyId,
				companyName: foundCompany.name ?? null,
			};
			if (isTest()) {
				invitationRO.verificationString = rawToken;
			}
			return invitationRO;
		}

		if (isSaaS()) {
			const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(companyId);
			await this.emailService.sendInvitationToCompany(
				invitedUserEmail,
				rawToken,
				companyId,
				foundCompany.name,
				companyCustomDomain,
				ValidationHelper.resolveEmailVerificationLinkBase(inputData.inviteLinkBase),
			);
		} else {
			// Plan 15 Phase 6 (rev 5): self-hosted sends no email — the admin takes the full
			// invitation link from the server logs and hands it to the invited user.
			this.logger.printTechString(
				`Invitation link: ${Constants.APP_DOMAIN_ADDRESS}/company/${companyId}/verify/${rawToken}/`,
			);
		}
		if (isTest()) {
			invitationRO.verificationString = rawToken;
		}
		return invitationRO;
	}
}
