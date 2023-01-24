import { IMessage } from '../email/email.interface.js';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface IEmailTransporterInterface {
  transportEmail(mail: IMessage): Promise<SMTPTransport.SentMessageInfo>;
}
