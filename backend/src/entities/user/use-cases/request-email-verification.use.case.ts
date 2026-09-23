import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import AbstractUseCase from '../../../common/abstract-use.case.js';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.interface.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { ValidationHelper } from '../../../helpers/validators/validation-helper.js';
import { EmailService } from '../../email/email/email.service.js';
import { OperationResultMessageWithEmailPayloadDs } from '../application/data-structures/operation-result-message.ds.js';
import { RequestEmailVerificationDs } from '../application/data-structures/request-email-change.ds.js';
import { IRequestEmailVerification } from './user-use-cases.interfaces.js';

@Injectable()
export class RequestEmailVerificationUseCase
	extends AbstractUseCase<RequestEmailVerificationDs, OperationResultMessageWithEmailPayloadDs>
	implements IRequestEmailVerification
{
	constructor(
		@Inject(BaseType.GLOBAL_DB_CONTEXT)
		protected _dbContext: IGlobalDatabaseContext,
		private readonly emailService: EmailService,
	) {
		super();
	}

	protected async implementation(
		inputData: RequestEmailVerificationDs,
	): Promise<OperationResultMessageWithEmailPayloadDs> {
		const { userId } = inputData;
		const foundUser = await this._dbContext.userRepository.findOneUserWithEmailVerification(userId);
		if (!foundUser) {
			throw new HttpException(
				{
					message: Messages.USER_NOT_FOUND,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		if (foundUser.isActive) {
			throw new HttpException(
				{
					message: Messages.EMAIL_ALREADY_CONFIRMED,
				},
				HttpStatus.BAD_REQUEST,
			);
		}
		const foundUserCompany = await this._dbContext.companyInfoRepository.findCompanyInfoByUserId(foundUser.id);

		// Trigger inversion (plan 15 Phase 2): bridge callers send the letter themselves — return
		// the raw token instead of sending (and never log it).
		if (inputData.suppressEmail) {
			const { rawToken } = await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(foundUser);
			return {
				message: Messages.EMAIL_VERIFICATION_REQUESTED,
				emailPayload: {
					type: 'email_confirmation',
					to: foundUser.email,
					rawToken,
					companyId: foundUserCompany.id,
				},
			};
		}

		const { rawToken } = await this._dbContext.emailVerificationRepository.createOrUpdateEmailVerification(foundUser);
		// Custom domains retired (plan 46): the link is built on the default domain.
		await this.emailService.sendEmailConfirmation(
			foundUser.email,
			rawToken,
			null,
			ValidationHelper.resolveEmailVerificationLinkBase(inputData.verificationLinkBase),
		);
		return { message: Messages.EMAIL_VERIFICATION_REQUESTED };
	}
}
