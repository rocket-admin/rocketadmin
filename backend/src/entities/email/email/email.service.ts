import { IMessage } from './email.interface.js';
import { EmailTransporterService } from '../transporter/email-transporter-service.js';
import { EmailGenerator } from './email.generator.js';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailLetter } from '../email-messages/email-message.js';
import { Inject, Injectable } from '@nestjs/common';
import * as nunjucks from 'nunjucks';
import * as Sentry from '@sentry/node';
import { getProcessVariable } from '../../../helpers/get-process-variable.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { BaseType } from '../../../common/data-injection.tokens.js';
import { Logger } from '../../../helpers/logging/Logger.js';
import PQueue from 'p-queue';
import Mail from 'nodemailer/lib/mailer/index.js';
import { EMAIL_TEXT } from '../email-text/email-text.js';
import { escapeHtml } from '../utils/escape-html.util.js';
import { TableActionEventEnum } from '../../../enums/table-action-event-enum.js';
import { UserInfoMessageData } from '../../table-actions/table-actions-module/table-action-activation.service.js';

interface ICronMessagingResults {
  messageId?: string;
  accepted?: Array<string | Mail.Address>;
  rejected?: Array<string | Mail.Address>;
}

@Injectable()
export class EmailService {
  private readonly emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
  constructor(
    @Inject(BaseType.NUNJUCKS)
    private readonly nunjucksEnv: nunjucks.Environment,
    private readonly emailTransporterService: EmailTransporterService,
  ) {}

  public async sendEmailToUser(letterContent: IMessage): Promise<SMTPTransport.SentMessageInfo | null> {
    if (process.env.NODE_ENV === 'test') return;
    const mailResult = await this.sendEmailWithTimeout(letterContent);
    if (mailResult) {
      return mailResult;
    }
  }

  public async sendEmailActionToUser(
    userEmail: string,
    userInfo: UserInfoMessageData,
    triggerOperation: TableActionEventEnum,
    tableName: string,
    primaryKeyValuesArray: Array<Record<string, unknown>>,
  ): Promise<SMTPTransport.SentMessageInfo | null> {
    const currentYear = new Date().getFullYear();
    const action =
      triggerOperation === TableActionEventEnum.ADD_ROW
        ? 'added a row'
        : triggerOperation === TableActionEventEnum.UPDATE_ROW
          ? 'updated a row'
          : triggerOperation === TableActionEventEnum.DELETE_ROW
            ? 'deleted a row'
            : 'performed an action';
    const textContent = EMAIL_TEXT.ACTION_EMAIL.EMAIL_TEXT(
      userInfo,
      triggerOperation,
      tableName,
      primaryKeyValuesArray,
    );

    const primaryKeysValuesStr = JSON.stringify(primaryKeyValuesArray);
    const letterContent: IMessage = {
      from: this.emailFrom,
      to: userEmail,
      subject: EMAIL_TEXT.ACTION_EMAIL.EMAIL_SUBJECT,
      text: textContent,
      html: this.nunjucksEnv.render('action-email-activation.njk', {
        userInfo,
        triggerOperation,
        tableName,
        action,
        primaryKeysValuesStr,
        currentYear,
      }),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendRemindersToUsers(userEmails: Array<string>): Promise<Array<ICronMessagingResults>> {
    const queue = new PQueue({ concurrency: 8 });
    const mailingResults: Array<SMTPTransport.SentMessageInfo | void> = await Promise.all(
      userEmails.map(async (email: string, index) => {
        return await queue.add(async () => {
          const result = await this.sendReminderToUser(email);
          console.info(`${index} email sending result ${JSON.stringify(result)}`);
          return result;
        });
      }),
    );
    return this.buildMailingResults(mailingResults);
  }

  public async send2faEnabledInCompany(
    userEmails: Array<string>,
    companyName: string,
  ): Promise<Array<SMTPTransport.SentMessageInfo | void>> {
    try {
      const queue = new PQueue({ concurrency: 3 });

      const mailingResults: Array<SMTPTransport.SentMessageInfo | void> = await Promise.all(
        userEmails.map(async (email: string) => {
          return await queue.add(async () => {
            return await this.send2faEnabledInCompanyToUser(email, companyName);
          });
        }),
      );
      return mailingResults;
    } catch (error) {
      Logger.logError(error);
    }
  }

  public async sendInvitedInNewGroup(email: string, groupTitle: string): Promise<SMTPTransport.SentMessageInfo> {
    const currentYear = new Date().getFullYear();
    const letterContent: IMessage = {
      from: this.emailFrom,
      to: email,
      subject: EMAIL_TEXT.INVITE_IN_GROUP.EMAIL_SUBJECT,
      text: EMAIL_TEXT.INVITE_IN_GROUP.EMAIL_TEXT(groupTitle),
      html: this.nunjucksEnv.render('invite-in-group-notification.njk', {
        groupTitle,
        currentYear,
      }),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendInvitationToCompany(
    email: string,
    verificationString: string,
    companyId: string,
    invitedCompanyName: string,
    customCompanyDomain: string | null,
  ): Promise<SMTPTransport.SentMessageInfo | null> {
    const currentYear = new Date().getFullYear();
    const domain = customCompanyDomain ? customCompanyDomain : Constants.APP_DOMAIN_ADDRESS;
    const link = `${domain}/company/${companyId}/verify/${verificationString}/`;
    const companyName = invitedCompanyName ? ` "${invitedCompanyName}" ` : ` `;
    const letterContent: IMessage = {
      from: this.emailFrom,
      to: email,
      subject: EMAIL_TEXT.INVITE_IN_COMPANY.EMAIL_SUBJECT,
      text: EMAIL_TEXT.INVITE_IN_COMPANY.EMAIL_TEXT(link, escapeHtml(companyName)),
      html: this.nunjucksEnv.render('invite-in-company-notification.njk', {
        linkToAccept: link,
        companyName,
        currentYear,
      }),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendEmailConfirmation(
    email: string,
    verificationString: string,
    customCompanyDomain: string | null,
  ): Promise<SMTPTransport.SentMessageInfo> {
    const domain = customCompanyDomain ? customCompanyDomain : Constants.APP_DOMAIN_ADDRESS;
    const link = `${domain}/external/user/email/verify/${verificationString}`;
    const currentYear = new Date().getFullYear();
    const letterContent: IMessage = {
      from: this.emailFrom,
      to: email,
      subject: EMAIL_TEXT.CONFIRM_EMAIL.EMAIL_SUBJECT,
      text: EMAIL_TEXT.CONFIRM_EMAIL.EMAIL_TEXT(link),
      html: this.nunjucksEnv.render('confirm-email-notification.njk', { linkToConfirm: link, currentYear }),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendEmailChanged(email: string): Promise<SMTPTransport.SentMessageInfo> {
    const currentYear = new Date().getFullYear();
    const letterContent: IMessage = {
      from: this.emailFrom,
      to: email,
      subject: EMAIL_TEXT.CHANGED_EMAIL.EMAIL_SUBJECT,
      text: EMAIL_TEXT.CHANGED_EMAIL.EMAIL_TEXT,
      html: this.nunjucksEnv.render('changed-email-notification.njk', { currentYear }),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendEmailChangeRequest(
    email: string,
    requestString: string,
    customCompanyDomain: string | null,
  ): Promise<SMTPTransport.SentMessageInfo> {
    const currentYear = new Date().getFullYear();
    const domain = customCompanyDomain ? customCompanyDomain : Constants.APP_DOMAIN_ADDRESS;
    const linkToConfirm = `${domain}/external/user/email/change/verify/${requestString}`;
    const letterContent: IMessage = {
      from: this.emailFrom,
      to: email,
      subject: EMAIL_TEXT.CHANGE_EMAIL_REQUEST.EMAIL_SUBJECT,
      text: EMAIL_TEXT.CHANGE_EMAIL_REQUEST.EMAIL_TEXT(linkToConfirm),
      html: this.nunjucksEnv.render('change-email-request-notification.njk', { linkToConfirm, currentYear }),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendPasswordResetRequest(
    email: string,
    requestString: string,
    customCompanyDomain: string | null,
  ): Promise<SMTPTransport.SentMessageInfo> {
    const currentYear = new Date().getFullYear();
    const domain = customCompanyDomain ? customCompanyDomain : Constants.APP_DOMAIN_ADDRESS;
    const linkToConfirm = `${domain}/external/user/password/reset/verify/${requestString}`;
    const letterContent: IMessage = {
      from: this.emailFrom,
      to: email,
      subject: EMAIL_TEXT.RESET_PASSWORD_REQUEST.EMAIL_SUBJECT,
      text: EMAIL_TEXT.RESET_PASSWORD_REQUEST.EMAIL_TEXT(linkToConfirm),
      html: this.nunjucksEnv.render('reset-password-request-notification.njk', { linkToConfirm, currentYear }),
    };
    return await this.sendEmailToUser(letterContent);
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

  private async sendReminderToUser(email: string): Promise<SMTPTransport.SentMessageInfo> {
    const letterContent: IMessage = {
      from: this.emailFrom,
      to: email,
      subject: EMAIL_TEXT.ROCKETADMIN_REMINDER.EMAIL_SUBJECT,
      text: EMAIL_TEXT.ROCKETADMIN_REMINDER.EMAIL_TEXT,
      html: this.nunjucksEnv.render('rocketadmin-reminder-email.html'),
    };
    return await this.sendEmailToUser(letterContent);
  }

  private async send2faEnabledInCompanyToUser(
    email: string,
    companyName: string,
  ): Promise<SMTPTransport.SentMessageInfo> {
    const letterContent: IMessage = {
      from: this.emailFrom,
      to: email,
      subject: EMAIL_TEXT.COMPANY_2FA_ENABLED.EMAIL_SUBJECT,
      text: EMAIL_TEXT.COMPANY_2FA_ENABLED.EMAIL_TEXT(companyName),
      html: this.nunjucksEnv.render('company-2fa-enabled-notification.njk', {
        companyName,
      }),
    };
    return await this.sendEmailToUser(letterContent);
  }

  private async sendEmailWithTimeout(letterContent: IMessage): Promise<SMTPTransport.SentMessageInfo | null> {
    return new Promise<SMTPTransport.SentMessageInfo>(async (resolve) => {
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

  private buildMailingResults(results: Array<SMTPTransport.SentMessageInfo | void>): Array<ICronMessagingResults> {
    return results.map((result) => {
      if (!result) {
        return;
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
