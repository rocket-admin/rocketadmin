import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { EmailService } from '../../email/email/email.service.js';
import { OperationResultMessageWithEmailPayloadDs } from '../application/data-structures/operation-result-message.ds.js';
import { RequestPasswordResetDs } from '../application/data-structures/request-password-reset.ds.js';
import { IRequestPasswordReset } from './user-use-cases.interfaces.js';

export class RequestResetUserPasswordUseCase
	extends AbstractUseCase<RequestPasswordResetDs, OperationResultMessageWithEmailPayloadDs>
	implements IRequestPasswordReset
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
		private readonly emailService: EmailService,
	) {
		super();
	}

	protected async implementation(emailData: RequestPasswordResetDs): Promise<OperationResultMessageWithEmailPayloadDs> {
		const { companyId, suppressEmail } = emailData;
		const email = emailData.email.toLowerCase();
		const foundUser = await this._dbContext.userRepository.findOneUserByEmailAndCompanyId(email, companyId);
		if (!foundUser) {
			// Trigger inversion (plan 15 Phase 2): the bridge answers the same `{message}` whether or
			// not the user exists (no payload, no error) so the SaaS caller leaks nothing to the
			// browser. The legacy path keeps today's behavior for old callers.
			if (suppressEmail) {
				return { message: Messages.PASSWORD_RESET_REQUESTED };
			}
			throw new HttpException(
				{
					message: Messages.USER_MISSING_EMAIL_OR_SOCIAL_REGISTERED,
				},
				HttpStatus.FORBIDDEN,
			);
		}

		if (suppressEmail) {
			const { rawToken } = await this._dbContext.passwordResetRepository.createOrUpdatePasswordResetEntity(foundUser);
			return {
				message: Messages.PASSWORD_RESET_REQUESTED,
				emailPayload: {
					type: 'password_reset_request',
					to: foundUser.email,
					rawToken,
					companyId,
				},
			};
		}

		const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(companyId);

		const { rawToken } = await this._dbContext.passwordResetRepository.createOrUpdatePasswordResetEntity(foundUser);

		const mailingResult = await this.emailService.sendPasswordResetRequest(
			foundUser.email,
			rawToken,
			companyCustomDomain,
			ValidationHelper.resolveEmailVerificationLinkBase(emailData.verificationLinkBase),
		);
		const resultMessage = mailingResult?.messageId
			? Messages.PASSWORD_RESET_REQUESTED_SUCCESSFULLY
			: Messages.PASSWORD_RESET_REQUESTED;
		return { message: resultMessage };
	}
}
