import { IMessage } from './email/email.interface.js';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailGenerator } from './email/email.generator.js';
import { EmailConfigService } from './email-config/email-config.service.js';
import { EmailTransporterService } from './transporter/email-transporter-service.js';
import { EmailService } from './email/email.service.js';
import { Constants } from '../../helpers/constants/constants.js';
import * as Sentry from '@sentry/node';
import { getProcessVariable } from '../../helpers/get-process-variable.js';

export async function sendEmailToUser(letterContent: IMessage): Promise<SMTPTransport.SentMessageInfo | null> {
  if (process.env.NODE_ENV === 'test') return;
  const mailResult = await sendEmailWithTimeout(letterContent);
  if (mailResult) {
    return mailResult;
  }
  console.error('Email sending timed out. Probably the email sending configuration is incorrect');
  return null;

  async function sendEmailWithTimeout(letterContent: IMessage): Promise<SMTPTransport.SentMessageInfo | null> {
    return new Promise<SMTPTransport.SentMessageInfo>(async (resolve) => {
      setTimeout(() => {
        resolve(null);
      }, 4000);
      const emailGenerator = new EmailGenerator();
      const emailConfigService = new EmailConfigService();
      const emailTransporterService = new EmailTransporterService(emailConfigService);
      const emailService = new EmailService(emailGenerator, emailTransporterService);
      try {
        const mailResult = await emailService.sendMail(letterContent);
        resolve(mailResult);
      } catch (e) {
        Sentry.captureException(e);
        console.error(e);
        resolve(null);
        // throw new HttpException(
        //   {
        //     message: e.message,
        //   },
        //   HttpStatus.INTERNAL_SERVER_ERROR,
        // );
      }
    });
  }
}

export async function sendPasswordResetRequest(
  email: string,
  requestString: string,
): Promise<SMTPTransport.SentMessageInfo> {
  const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
  const letterContent: IMessage = {
    from: emailFrom,
    to: email,
    subject: Constants.EMAIL.PASSWORD.RESET_PASSWORD_REQUEST_SUBJECT_DATA,
    text: Constants.EMAIL.PASSWORD.RESET_PASSWORD_EMAIL_TEXT(requestString),
    html: Constants.EMAIL.PASSWORD.RESET_PASSWORD_EMAIL_HTML(requestString),
  };
  return await sendEmailToUser(letterContent);
}

export async function sendEmailChangeRequest(
  email: string,
  requestString: string,
): Promise<SMTPTransport.SentMessageInfo> {
  const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
  const letterContent: IMessage = {
    from: emailFrom,
    to: email,
    subject: Constants.EMAIL.EMAIL.CHANGE_EMAIL_SUBJECT_DATA,
    text: Constants.EMAIL.EMAIL.CHANGE_EMAIL_TEXT(requestString),
    html: Constants.EMAIL.EMAIL.CHANGE_EMAIL_HTML(requestString),
  };
  return await sendEmailToUser(letterContent);
}

export async function sendEmailChanged(email: string): Promise<SMTPTransport.SentMessageInfo> {
  const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
  const letterContent: IMessage = {
    from: emailFrom,
    to: email,
    subject: Constants.EMAIL.EMAIL.CHANGED_EMAIL_SUBJECT_DATA,
    text: Constants.EMAIL.EMAIL.CHANGED_EMAIL_TEXT,
    html: Constants.EMAIL.EMAIL.CHANGED_EMAIL_HTML,
  };
  return await sendEmailToUser(letterContent);
}

export async function sendReminderToUser(email: string): Promise<SMTPTransport.SentMessageInfo> {
  const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
  const letterContent: IMessage = {
    from: emailFrom,
    to: email,
    subject: Constants.AUTOADMIN_EMAIL_SUBJECT_DATA,
    text: Constants.AUTOADMIN_EMAIL_TEXT,
    html: Constants.AUTOADMIN_EMAIL_BODY,
  };
  return await sendEmailToUser(letterContent);
}

export async function sendEmailConfirmation(
  email: string,
  verificationString: string,
): Promise<SMTPTransport.SentMessageInfo> {
  const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
  const letterContent: IMessage = {
    from: emailFrom,
    to: email,
    subject: Constants.EMAIL.EMAIL.CONFIRM_EMAIL_SUBJECT,
    text: Constants.EMAIL.EMAIL.CONFIRM_EMAIL_TEXT(verificationString),
    html: Constants.EMAIL.EMAIL.CONFIRM_EMAIL_HTML(verificationString),
  };
  return await sendEmailToUser(letterContent);
}

export async function sendInvitationToCompany(
  email: string,
  verificationString: string,
  companyId: string,
  companyName: string,
): Promise<SMTPTransport.SentMessageInfo | null> {
  const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
  const letterContent: IMessage = {
    from: emailFrom,
    to: email,
    subject: Constants.EMAIL.COMPANY_INVITE.COMPANY_INVITE_SUBJECT_DATA,
    text: Constants.EMAIL.COMPANY_INVITE.COMPANY_INVITE_TEXT_DATA(verificationString, companyId, companyName),
    html: Constants.EMAIL.COMPANY_INVITE.COMPANY_INVITE_HTML_DATA(verificationString, companyId, companyName),
  };
  return await sendEmailToUser(letterContent);
}

export async function send2faEnabledInCompanyToUser(
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
  return await sendEmailToUser(letterContent);
}

export async function sendInvitedInNewGroup(email: string, groupTitle: string) {
  const emailFrom = getProcessVariable('EMAIL_FROM') || Constants.AUTOADMIN_SUPPORT_MAIL;
  const letterContent: IMessage = {
    from: emailFrom,
    to: email,
    subject: Constants.EMAIL.GROUP_INVITE.GROUP_INVITE_SUBJECT_DATA,
    text: Constants.EMAIL.GROUP_INVITE.GROUP_INVITE_TEXT_DATA(groupTitle),
    html: Constants.EMAIL.GROUP_INVITE.GROUP_INVITE_HTML_DATA(groupTitle),
  };
  return await sendEmailToUser(letterContent);
}
