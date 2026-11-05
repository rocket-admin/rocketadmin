import { Inject, Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import Mail from 'nodemailer/lib/mailer/index.js';
import SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import * as nunjucks from 'nunjucks';
import PQueue from 'p-queue';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { isTest } from '../../../helpers/app/is-test.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { getErrorMessage } from '../../../helpers/get-error-message.js';
import { SaasEmailGatewayService } from '../../../microservices/gateways/saas-gateway.ts/saas-email-gateway.service.js';
import { appConfig } from '../../../shared/config/app-config.js';
import { WinstonLogger } from '../../logging/winston-logger.js';
import { UserInfoMessageData } from '../../table-actions/table-actions-module/table-action-activation.service.js';
import { EmailConfigService } from '../email-config/email-config.service.js';
import { EmailLetter } from '../email-messages/email-message.js';
import { EMAIL_TEXT } from '../email-text/email-text.js';
import { EmailTransporterService } from '../transporter/email-transporter-service.js';
import { escapeHtml } from '../utils/escape-html.util.js';
import { EmailGenerator } from './email.generator.js';
import { IMessage } from './email.interface.js';

const SMTP_SEND_TIMEOUT_MS = 4000;

export interface ICronMessagingResults {
	email: string;
	messageId?: string;
	accepted?: Array<string | Mail.Address>;
	rejected?: Array<string | Mail.Address>;
	// Set when the dispatch failed or was suppressed — the Slack cron report
	// groups failures by this string.
	failureReason?: string;
}

// Reminder-cron view of one dispatch: either a transporter result or a named
// failure reason. Transactional callers keep the info|null contract instead.
export type EmailDispatchOutcome =
	| { ok: true; info: SMTPTransport.SentMessageInfo; deliveryError?: string }
	| { ok: false; reason: string };

export function mapReminderOutcomeToCronResult(email: string, outcome: EmailDispatchOutcome): ICronMessagingResults {
	if (outcome.ok === false) {
		return { email, failureReason: outcome.reason };
	}
	const { messageId, accepted, rejected } = outcome.info;
	const base: ICronMessagingResults = {
		email,
		messageId: messageId ? messageId : undefined,
		accepted: accepted ? accepted : undefined,
		rejected: rejected ? rejected : undefined,
	};
	// The saas webhook is best-effort: SMTP failure still comes back as 2xx with
	// the address in `rejected` — surface it as a failure, not a success row.
	if (!accepted || accepted.length === 0) {
		base.failureReason = `rejected by saas transporter${outcome.deliveryError ? `: ${outcome.deliveryError}` : ''}`;
	}
	return base;
}

// Every public send* method builds the letter parameters (including the legacy link
// computation with linkBase/customCompanyDomain handling) and hands them to the
// `dispatchEmail` seam. In SaaS mode the seam fires the saas-side composer webhook;
// self-hosted it composes the letter locally (EMAIL_TEXT + nunjucks templates) and sends
// it through the instance's own SMTP server (EMAIL_CONFIG_STRING / EMAIL_SERVICE_*), or
// suppresses it when no SMTP server is configured.
@Injectable()
export class EmailService {
	constructor(
		private readonly emailTransporterService: EmailTransporterService,
		private readonly saasEmailGatewayService: SaasEmailGatewayService,
		private readonly logger: WinstonLogger,
		private readonly emailConfigService: EmailConfigService,
		@Inject(BaseType.NUNJUCKS)
		private readonly nunjucksEnv: nunjucks.Environment,
	) {}

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

	public async sendRemindersToUsers(userEmails: Array<string>): Promise<Array<ICronMessagingResults>> {
		const queue = new PQueue({ concurrency: 3 });

		const mailingResults: Array<ICronMessagingResults> = [];

		for (const email of userEmails) {
			try {
				const outcome = await queue.add(async () => {
					return await this.dispatchEmailWithOutcome('reminder', email, {});
				});
				mailingResults.push(
					mapReminderOutcomeToCronResult(email, outcome ?? { ok: false, reason: 'dispatch returned no outcome' }),
				);
			} catch (error) {
				this.logger.error(`Failed to send reminder to ${email}: ${getErrorMessage(error)}`);
				Sentry.captureException(error);
				mailingResults.push({ email, failureReason: `dispatch threw: ${getErrorMessage(error)}` });
			}
		}

		await queue.onIdle();

		return mailingResults;
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

	// The single gate every outgoing letter passes through:
	// - test mode   -> no-op (unchanged semantics);
	// - SaaS mode   -> saas-side composer webhook, mapped onto a SentMessageInfo-compatible
	//                  object (a failure never fails the parent operation);
	// - self-hosted -> composed locally and sent through the configured SMTP server; suppressed
	//                  when none is configured. The reminder is SaaS onboarding copy and never
	//                  leaves a self-hosted instance.
	// Transactional callers use this null-contract wrapper; the reminder cron uses
	// dispatchEmailWithOutcome so the failure reason survives into its Slack report.
	private async dispatchEmail(
		type: string,
		to: string,
		params: Record<string, unknown>,
	): Promise<SMTPTransport.SentMessageInfo | null> {
		const outcome = await this.dispatchEmailWithOutcome(type, to, params);
		return outcome.ok ? outcome.info : null;
	}

	private async dispatchEmailWithOutcome(
		type: string,
		to: string,
		params: Record<string, unknown>,
	): Promise<EmailDispatchOutcome> {
		if (isTest()) {
			return { ok: false, reason: 'suppressed: test env' };
		}
		if (!isSaaS()) {
			return await this.dispatchSelfHostedEmail(type, to, params);
		}
		const webhookOutcome = await this.saasEmailGatewayService.sendEmail(type, to, params);
		if (webhookOutcome.ok === false) {
			return { ok: false, reason: webhookOutcome.reason };
		}
		const sentLike: Pick<SMTPTransport.SentMessageInfo, 'messageId' | 'accepted' | 'rejected'> = {
			messageId: webhookOutcome.result.messageId ?? '',
			accepted: webhookOutcome.result.accepted,
			rejected: webhookOutcome.result.rejected,
		};
		return {
			ok: true,
			info: sentLike as SMTPTransport.SentMessageInfo,
			deliveryError: webhookOutcome.result.deliveryError,
		};
	}

	private async dispatchSelfHostedEmail(
		type: string,
		to: string,
		params: Record<string, unknown>,
	): Promise<EmailDispatchOutcome> {
		if (type === 'reminder') {
			return { ok: false, reason: 'suppressed: reminder is SaaS-only' };
		}
		if (!this.emailConfigService.isConfigured()) {
			this.logger.warn(
				`Email "${type}" to ${to} not sent: no SMTP server configured (set EMAIL_CONFIG_STRING or EMAIL_SERVICE_HOST)`,
			);
			return { ok: false, reason: 'suppressed: SMTP not configured' };
		}
		let letter: IMessage;
		try {
			letter = this.composeLocalLetter(type, to, params);
		} catch (error) {
			this.logger.error(`Failed to compose email "${type}" to ${to}: ${getErrorMessage(error)}`);
			Sentry.captureException(error);
			return { ok: false, reason: `compose failed: ${getErrorMessage(error)}` };
		}
		const outcome = await this.sendEmailWithTimeout(letter);
		if (outcome.ok === false) {
			this.logger.error(`Failed to send email "${type}" to ${to} via SMTP: ${outcome.reason}`);
		}
		return outcome;
	}

	// Self-hosted counterpart of the saas-side composer: same letter types and params as the
	// webhook payload (see the public send* methods above).
	private composeLocalLetter(type: string, to: string, params: Record<string, unknown>): IMessage {
		const from = appConfig.email.from;
		const currentYear = new Date().getFullYear();
		switch (type) {
			case 'table_action': {
				const userInfo = params.userInfo as UserInfoMessageData;
				const tableName = params.tableName as string;
				const primaryKeyValuesArray = params.primaryKeyValuesArray as Array<Record<string, unknown>>;
				const action = this.describeTableAction(params.triggerOperation as TableActionEventEnum);
				const textContent = EMAIL_TEXT.ACTION_EMAIL.EMAIL_TEXT(userInfo, action, tableName, primaryKeyValuesArray);
				return {
					from,
					to,
					subject: EMAIL_TEXT.ACTION_EMAIL.EMAIL_SUBJECT,
					text: textContent,
					html: this.nunjucksEnv.render('action-email-activation.njk', {
						userInfo,
						triggerOperation: params.triggerOperation,
						tableName,
						action,
						primaryKeysValuesStr: JSON.stringify(primaryKeyValuesArray),
						currentYear,
						textContent,
						primaryKeyValuesArray,
					}),
				};
			}
			case 'company_2fa_enabled': {
				const companyName = params.companyName as string;
				return {
					from,
					to,
					subject: EMAIL_TEXT.COMPANY_2FA_ENABLED.EMAIL_SUBJECT,
					text: EMAIL_TEXT.COMPANY_2FA_ENABLED.EMAIL_TEXT(companyName),
					html: this.nunjucksEnv.render('company-2fa-enabled-notification.njk', { companyName }),
				};
			}
			case 'group_invite': {
				const groupTitle = params.groupTitle as string;
				return {
					from,
					to,
					subject: EMAIL_TEXT.INVITE_IN_GROUP.EMAIL_SUBJECT,
					text: EMAIL_TEXT.INVITE_IN_GROUP.EMAIL_TEXT(groupTitle),
					html: this.nunjucksEnv.render('invite-in-group-notification.njk', { groupTitle, currentYear }),
				};
			}
			case 'company_invite': {
				const link = params.link as string;
				const rawCompanyName = params.companyName as string | null;
				const companyName = rawCompanyName ? ` "${rawCompanyName}" ` : ' ';
				return {
					from,
					to,
					subject: EMAIL_TEXT.INVITE_IN_COMPANY.EMAIL_SUBJECT,
					text: EMAIL_TEXT.INVITE_IN_COMPANY.EMAIL_TEXT(link, escapeHtml(companyName)),
					html: this.nunjucksEnv.render('invite-in-company-notification.njk', {
						linkToAccept: link,
						companyName,
						currentYear,
					}),
				};
			}
			case 'email_confirmation': {
				const link = params.link as string;
				return {
					from,
					to,
					subject: EMAIL_TEXT.CONFIRM_EMAIL.EMAIL_SUBJECT,
					text: EMAIL_TEXT.CONFIRM_EMAIL.EMAIL_TEXT(link),
					html: this.nunjucksEnv.render('confirm-email-notification.njk', { linkToConfirm: link, currentYear }),
				};
			}
			case 'email_changed':
				return {
					from,
					to,
					subject: EMAIL_TEXT.CHANGED_EMAIL.EMAIL_SUBJECT,
					text: EMAIL_TEXT.CHANGED_EMAIL.EMAIL_TEXT,
					html: this.nunjucksEnv.render('changed-email-notification.njk', { currentYear }),
				};
			case 'email_change_request': {
				const linkToConfirm = params.link as string;
				return {
					from,
					to,
					subject: EMAIL_TEXT.CHANGE_EMAIL_REQUEST.EMAIL_SUBJECT,
					text: EMAIL_TEXT.CHANGE_EMAIL_REQUEST.EMAIL_TEXT(linkToConfirm),
					html: this.nunjucksEnv.render('change-email-request-notification.njk', { linkToConfirm, currentYear }),
				};
			}
			case 'password_reset_request': {
				const linkToConfirm = params.link as string;
				return {
					from,
					to,
					subject: EMAIL_TEXT.RESET_PASSWORD_REQUEST.EMAIL_SUBJECT,
					text: EMAIL_TEXT.RESET_PASSWORD_REQUEST.EMAIL_TEXT(linkToConfirm),
					html: this.nunjucksEnv.render('reset-password-request-notification.njk', { linkToConfirm, currentYear }),
				};
			}
			default:
				throw new Error(`unknown email type "${type}"`);
		}
	}

	private describeTableAction(triggerOperation: TableActionEventEnum): string {
		switch (triggerOperation) {
			case TableActionEventEnum.ADD_ROW:
				return 'added a row';
			case TableActionEventEnum.UPDATE_ROW:
				return 'updated a row';
			case TableActionEventEnum.DELETE_ROW:
				return 'deleted a row';
			default:
				return 'performed an action';
		}
	}

	private async sendEmailWithTimeout(letterContent: IMessage): Promise<EmailDispatchOutcome> {
		let timer: NodeJS.Timeout | undefined;
		const timeout = new Promise<EmailDispatchOutcome>((resolve) => {
			timer = setTimeout(
				() => resolve({ ok: false, reason: `timed out after ${SMTP_SEND_TIMEOUT_MS}ms` }),
				SMTP_SEND_TIMEOUT_MS,
			);
		});
		const send = this.sendMail(letterContent).then(
			(info): EmailDispatchOutcome => ({ ok: true, info }),
			(error: unknown): EmailDispatchOutcome => {
				Sentry.captureException(error);
				return { ok: false, reason: getErrorMessage(error) };
			},
		);
		try {
			return await Promise.race([send, timeout]);
		} finally {
			clearTimeout(timer);
		}
	}
}
