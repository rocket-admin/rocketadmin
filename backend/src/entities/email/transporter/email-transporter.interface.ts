import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { IMessage } from '../email/email.interface.js';

export interface IEmailTransporterInterface {
	transportEmail(mail: IMessage): Promise<SMTPTransport.SentMessageInfo>;
}
