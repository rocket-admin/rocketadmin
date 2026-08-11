import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { SaasCompanyGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-company-gateway.service.js';
import { EmailService } from '../../email/email/email.service.js';
import { OperationResultMessageWithEmailPayloadDs } from '../application/data-structures/operation-result-message.ds.js';
import { RequestEmailChangeDs } from '../application/data-structures/request-email-change.ds.js';
import { IRequestEmailChange } from './user-use-cases.interfaces.js';

@Injectable()
export class RequestChangeUserEmailUseCase
	extends AbstractUseCase<RequestEmailChangeDs, OperationResultMessageWithEmailPayloadDs>
	implements IRequestEmailChange
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly saasCompanyGatewayService: SaasCompanyGatewayService,
		private readonly emailService: EmailService,
	) {
		super();
	}

	protected async implementation(inputData: RequestEmailChangeDs): Promise<OperationResultMessageWithEmailPayloadDs> {
		const { userId } = inputData;
		const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
		if (!foundUser) {
			throw new HttpException(
				{
					message: Messages.USER_NOT_FOUND,
				},
				HttpStatus.NOT_FOUND,
			);
		}
		if (!foundUser.isActive) {
			throw new HttpException(
				{
					message: Messages.EMAIL_NOT_CONFIRMED,
				},
				HttpStatus.FORBIDDEN,
			);
		}
		const { rawToken } = await this._dbContext.emailChangeRepository.createOrUpdateEmailChangeEntity(foundUser);
		const userCompanyInfo = await this._dbContext.companyInfoRepository.findCompanyInfoByUserId(userId);

		// Trigger inversion (plan 15 Phase 2): bridge callers send the letter themselves — return
		// the raw token instead of sending (and never log it).
		if (inputData.suppressEmail) {
			return {
				message: Messages.EMAIL_CHANGE_REQUESTED,
				emailPayload: {
					type: 'email_change_request',
					to: foundUser.email,
					rawToken,
					companyId: userCompanyInfo.id,
				},
			};
		}

		const companyCustomDomain = await this.saasCompanyGatewayService.getCompanyCustomDomainById(userCompanyInfo.id);
		const mailingResult = await this.emailService.sendEmailChangeRequest(
			foundUser.email,
			rawToken,
			companyCustomDomain,
			ValidationHelper.resolveEmailVerificationLinkBase(inputData.verificationLinkBase),
		);
		const resultMessage = mailingResult?.messageId
			? Messages.EMAIL_CHANGE_REQUESTED_SUCCESSFULLY
			: Messages.EMAIL_CHANGE_REQUESTED;
		return { message: resultMessage };
	}
}
