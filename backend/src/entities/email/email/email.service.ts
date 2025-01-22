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

interface ICronMessagingResults {
  messageId?: string;
  accepted?: Array<string | Mail.Address>;
  rejected?: Array<string | Mail.Address>;
}

@Injectable()
export class EmailService {
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

  public async sendRemindersToUsers(userEmails: Array<string>): Promise<Array<ICronMessagingResults>> {
    const queue = new PQueue({ concurrency: 8 });
    const mailingResults: Array<SMTPTransport.SentMessageInfo | void> = await Promise.all(
      userEmails.map(async (email: string, index) => {
        return await queue.add(async () => {
          const result = await this.sendReminderToUser(email);
          console.log(`${index} email sending result ${JSON.stringify(result)}`);
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
    const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
    const letterContent: IMessage = {
      from: emailFrom,
      to: email,
      subject: Constants.EMAIL.GROUP_INVITE.GROUP_INVITE_SUBJECT_DATA,
      text: Constants.EMAIL.GROUP_INVITE.GROUP_INVITE_TEXT_DATA(groupTitle),
      html: Constants.EMAIL.GROUP_INVITE.GROUP_INVITE_HTML_DATA(groupTitle),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async send2faEnabledInCompanyToUser(
    email: string,
    companyName: string,
  ): Promise<SMTPTransport.SentMessageInfo> {
    const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
    const letterContent: IMessage = {
      from: emailFrom,
      to: email,
      subject: Constants.EMAIL.COMPANY_2FA_ENABLED.COMPANY_2FA_ENABLED_SUBJECT_DATA,
      text: Constants.EMAIL.COMPANY_2FA_ENABLED.COMPANY_2FA_ENABLED_TEXT_DATA(companyName),
      html: Constants.EMAIL.COMPANY_2FA_ENABLED.COMPANY_2FA_ENABLED_HTML_DATA(companyName),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendInvitationToCompany(
    email: string,
    verificationString: string,
    companyId: string,
    companyName: string,
    customCompanyDomain: string | null,
  ): Promise<SMTPTransport.SentMessageInfo | null> {
    const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
    const letterContent: IMessage = {
      from: emailFrom,
      to: email,
      subject: Constants.EMAIL.COMPANY_INVITE.COMPANY_INVITE_SUBJECT_DATA,
      text: Constants.EMAIL.COMPANY_INVITE.COMPANY_INVITE_TEXT_DATA(
        verificationString,
        customCompanyDomain,
        companyId,
        companyName,
      ),
      html: Constants.EMAIL.COMPANY_INVITE.COMPANY_INVITE_HTML_DATA(
        verificationString,
        customCompanyDomain,
        companyId,
        companyName,
      ),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendEmailConfirmation(
    email: string,
    verificationString: string,
    customCompanyDomain: string | null,
  ): Promise<SMTPTransport.SentMessageInfo> {
    const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
    const letterContent: IMessage = {
      from: emailFrom,
      to: email,
      subject: Constants.EMAIL.EMAIL.CONFIRM_EMAIL_SUBJECT,
      text: Constants.EMAIL.EMAIL.CONFIRM_EMAIL_TEXT(verificationString, customCompanyDomain),
      html: Constants.EMAIL.EMAIL.CONFIRM_EMAIL_HTML(verificationString, customCompanyDomain),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendReminderToUser(email: string): Promise<SMTPTransport.SentMessageInfo> {
    const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
    const letterContent: IMessage = {
      from: emailFrom,
      to: email,
      subject: Constants.AUTOADMIN_EMAIL_SUBJECT_DATA,
      text: Constants.AUTOADMIN_EMAIL_TEXT,
      html: Constants.AUTOADMIN_EMAIL_BODY,
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendEmailChanged(email: string): Promise<SMTPTransport.SentMessageInfo> {
    const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
    const letterContent: IMessage = {
      from: emailFrom,
      to: email,
      subject: Constants.EMAIL.EMAIL.CHANGED_EMAIL_SUBJECT_DATA,
      text: Constants.EMAIL.EMAIL.CHANGED_EMAIL_TEXT,
      html: Constants.EMAIL.EMAIL.CHANGED_EMAIL_HTML,
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendEmailChangeRequest(
    email: string,
    requestString: string,
    customCompanyDomain: string | null,
  ): Promise<SMTPTransport.SentMessageInfo> {
    const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
    const letterContent: IMessage = {
      from: emailFrom,
      to: email,
      subject: Constants.EMAIL.EMAIL.CHANGE_EMAIL_SUBJECT_DATA,
      text: Constants.EMAIL.EMAIL.CHANGE_EMAIL_TEXT(requestString, customCompanyDomain),
      html: Constants.EMAIL.EMAIL.CHANGE_EMAIL_HTML(requestString, customCompanyDomain),
    };
    return await this.sendEmailToUser(letterContent);
  }

  public async sendPasswordResetRequest(
    email: string,
    requestString: string,
    customCompanyDomain: string | null,
  ): Promise<SMTPTransport.SentMessageInfo> {
    const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
    const letterContent: IMessage = {
      from: emailFrom,
      to: email,
      subject: Constants.EMAIL.PASSWORD.RESET_PASSWORD_REQUEST_SUBJECT_DATA,
      text: Constants.EMAIL.PASSWORD.RESET_PASSWORD_EMAIL_TEXT(requestString, customCompanyDomain),
      html: Constants.EMAIL.PASSWORD.RESET_PASSWORD_EMAIL_HTML(requestString, customCompanyDomain),
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
