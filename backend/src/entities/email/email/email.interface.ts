import { AbstractEmailLetter } from './abstract-email-letter.js';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface IMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface IEmailGenerator {
  generateEmail<TPayload>(email: AbstractEmailLetter<TPayload>): IMessage;
}

export interface IEmailService {
  sendMail(letterContent: IMessage): Promise<SMTPTransport.SentMessageInfo>;
}
