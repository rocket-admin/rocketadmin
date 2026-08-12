import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import Mail from 'nodemailer/lib/mailer/index.js';
import SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import PQueue from 'p-queue';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { isTest } from '../../../helpers/app/is-test.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { SaasEmailGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-email-gateway.service.js';
import { WinstonLogger } from '../../logging/winston-logger.js';
import { UserInfoMessageData } from '../../table-actions/table-actions-module/table-action-activation.service.js';
import { EmailLetter } from '../email-messages/email-message.js';
import { EmailTransporterService } from '../transporter/email-transporter-service.js';
import { EmailGenerator } from './email.generator.js';
import { IMessage } from './email.interface.js';

export interface ICronMessagingResults {
	messageId?: string;
	accepted?: Array<string | Mail.Address>;
	rejected?: Array<string | Mail.Address>;
}

// Plan 15 Phase 3: the core composes no letters and transports no email in any mode.
// Every public send* method builds the letter parameters (including the legacy link
// computation with linkBase/customCompanyDomain handling) and hands them to the
// `dispatchEmail` seam, which fires the saas-side composer webhook in SaaS mode and
// suppresses the send entirely self-hosted (rev-5 decision: self-hosted sends NOTHING).
// The transporter/nunjucks path below the seam (`sendEmailToUser`/`sendMail`) is dead
// code kept only until the Phase 7 deletion.
@Injectable()
export class EmailService {
	constructor(
		private readonly emailTransporterService: EmailTransporterService,
		private readonly saasEmailGatewayService: SaasEmailGatewayService,
		private readonly logger: WinstonLogger,
	) {}

	// Dead code since plan 15 Phase 3 (kept for Phase 7 deletion): nothing routes letters
	// through the local transporter anymore.
	public async sendEmailToUser(letterContent: IMessage): Promise<SMTPTransport.SentMessageInfo | null> {
		if (isTest()) return null;
		const mailResult = await this.sendEmailWithTimeout(letterContent);
		if (mailResult) {
			return mailResult;
		}
		return null;
	}

	public async sendEmailActionToUser(
		userEmail: string,
		userInfo: UserInfoMessageData,
		triggerOperation: TableActionEventEnum,
		tableName: string,
		primaryKeyValuesArray: Array<Record<string, unknown>>,
	): Promise<SMTPTransport.SentMessageInfo | null> {
		return await this.dispatchEmail('table_action', userEmail, {
			userInfo,
			triggerOperation: triggerOperation as string,
			tableName,
			primaryKeyValuesArray,
		});
	}

	public async sendRemindersToUsers(userEmails: Array<string>): Promise<Array<ICronMessagingResults | null>> {
		const queue = new PQueue({ concurrency: 3 });

		const mailingResults: Array<SMTPTransport.SentMessageInfo | null | undefined> = [];

		for (const email of userEmails) {
			try {
				const result = await queue.add(async () => {
					return await this.dispatchEmail('reminder', email, {});
				});
				mailingResults.push(result);
			} catch (error) {
				this.logger.error(`Failed to send reminder to ${email}: ${getErrorMessage(error)}`);
				Sentry.captureException(error);
				mailingResults.push(null);
			}
		}

		await queue.onIdle();

		return this.buildMailingResults(mailingResults);
	}

	public async send2faEnabledInCompany(
		userEmails: Array<string>,
		companyName: string,
	): Promise<Array<SMTPTransport.SentMessageInfo | null | undefined>> {
		try {
			const queue = new PQueue({ concurrency: 3 });

			const mailingResults: Array<SMTPTransport.SentMessageInfo | null | undefined> = await Promise.all(
				userEmails.map(async (email: string) => {
					return await queue.add(async () => {
						return await this.dispatchEmail('company_2fa_enabled', email, { companyName });
					});
				}),
			);
			return mailingResults;
		} catch (error) {
			this.logger.error(error);
			return [];
		}
	}

	public async sendInvitedInNewGroup(email: string, groupTitle: string): Promise<SMTPTransport.SentMessageInfo | null> {
		return await this.dispatchEmail('group_invite', email, { groupTitle });
	}

	public async sendInvitationToCompany(
		email: string,
		verificationString: string,
		companyId: string,
		invitedCompanyName: string,
		customCompanyDomain: string | null,
		verificationLinkBase: string | null = null,
	): Promise<SMTPTransport.SentMessageInfo | null> {
		const domain = customCompanyDomain ? customCompanyDomain : Constants.APP_DOMAIN_ADDRESS;
		// A satellite-provided base already carries the company id in its path.
		const link = verificationLinkBase
			? `${verificationLinkBase}/${verificationString}`
			: `${domain}/company/${companyId}/verify/${verificationString}/`;
		// The saas composer adds the quotes/spacing around the name — pass the raw value or null.
		return await this.dispatchEmail('company_invite', email, {
			link,
			companyName: invitedCompanyName ? invitedCompanyName : null,
		});
	}

	public async sendEmailConfirmation(
		email: string,
		verificationString: string,
		customCompanyDomain: string | null,
		verificationLinkBase: string | null = null,
	): Promise<SMTPTransport.SentMessageInfo | null> {
		const domain = customCompanyDomain ? customCompanyDomain : Constants.APP_DOMAIN_ADDRESS;
		const link = verificationLinkBase
			? `${verificationLinkBase}/${verificationString}`
			: `${domain}/external/user/email/verify/${verificationString}`;
		return await this.dispatchEmail('email_confirmation', email, { link });
	}

	public async sendEmailChanged(email: string): Promise<SMTPTransport.SentMessageInfo | null> {
		return await this.dispatchEmail('email_changed', email, {});
	}

	public async sendEmailChangeRequest(
		email: string,
		requestString: string,
		customCompanyDomain: string | null,
		verificationLinkBase: string | null = null,
	): Promise<SMTPTransport.SentMessageInfo | null> {
		const domain = customCompanyDomain ? customCompanyDomain : Constants.APP_DOMAIN_ADDRESS;
		const link = verificationLinkBase
			? `${verificationLinkBase}/${requestString}`
			: `${domain}/external/user/email/change/verify/${requestString}`;
		return await this.dispatchEmail('email_change_request', email, { link });
	}

	public async sendPasswordResetRequest(
		email: string,
		requestString: string,
		customCompanyDomain: string | null,
		verificationLinkBase: string | null = null,
	): Promise<SMTPTransport.SentMessageInfo | null> {
		const domain = customCompanyDomain ? customCompanyDomain : Constants.APP_DOMAIN_ADDRESS;
		const link = verificationLinkBase
			? `${verificationLinkBase}/${requestString}`
			: `${domain}/external/user/password/reset/verify/${requestString}`;
		return await this.dispatchEmail('password_reset_request', email, { link });
	}

	// Dead code since plan 15 Phase 3 (kept for Phase 7 deletion), together with the
	// transporter/template-engine machinery it drives.
	public async sendMail(letterContent: IMessage): Promise<SMTPTransport.SentMessageInfo> {
		const testEmail = new EmailLetter({
			from: letterContent.from,
			to: letterContent.to,
			subject: letterContent.subject,
			text: letterContent.text,
			html: letterContent.html,
		});
		const emailGenerator = new EmailGenerator();
		const emailMessage = emailGenerator.generateEmail(testEmail);
		return await this.emailTransporterService.transportEmail(emailMessage);
	}

	// Plan 15 Phase 3 seam — the single gate every outgoing letter passes through:
	// - test mode  -> no-op (unchanged semantics);
	// - SaaS mode  -> saas-side composer webhook, mapped onto a SentMessageInfo-compatible
	//                 object (null on any failure — email never fails the parent operation);
	// - self-hosted -> suppressed entirely (plan 15 rev 5: self-hosted sends NOTHING, ever).
	private async dispatchEmail(
		type: string,
		to: string,
		params: Record<string, unknown>,
	): Promise<SMTPTransport.SentMessageInfo | null> {
		if (isTest()) {
			return null;
		}
		if (isSaaS()) {
			const webhookResult = await this.saasEmailGatewayService.sendEmail(type, to, params);
			if (!webhookResult) {
				return null;
			}
			const sentLike: Pick<SMTPTransport.SentMessageInfo, 'messageId' | 'accepted' | 'rejected'> = {
				messageId: webhookResult.messageId ?? '',
				accepted: webhookResult.accepted ?? [],
				rejected: webhookResult.rejected ?? [],
			};
			return sentLike as SMTPTransport.SentMessageInfo;
		}
		this.logger.debug(`email suppressed (self-hosted): ${type}`);
		return null;
	}

	// Dead code since plan 15 Phase 3 (kept for Phase 7 deletion).
	private async sendEmailWithTimeout(letterContent: IMessage): Promise<SMTPTransport.SentMessageInfo | null> {
		return new Promise<SMTPTransport.SentMessageInfo | null>(async (resolve) => {
			setTimeout(() => {
				resolve(null);
			}, 4000);
			try {
				const mailResult = await this.sendMail(letterContent);
				resolve(mailResult);
			} catch (e) {
				Sentry.captureException(e);
				console.error(e);
				resolve(null);
			}
		});
	}

	private buildMailingResults(
		results: Array<SMTPTransport.SentMessageInfo | null | undefined>,
	): Array<ICronMessagingResults | null> {
		return results.map((result) => {
			if (!result) {
				return null;
			}
			const { messageId, accepted, rejected } = result;
			return {
				messageId: messageId ? messageId : undefined,
				accepted: accepted ? accepted : undefined,
				rejected: rejected ? rejected : undefined,
			};
		});
	}
}
