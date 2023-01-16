import * as nodemailer from 'nodemailer';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';
import { IMessage } from '../email/email.interface.js';
import { EmailConfigService } from '../email-config/email-config.service.js';
import { IEmailTransporterInterface } from './email-transporter.interface.js';

export class EmailTransporterService implements IEmailTransporterInterface {
  constructor(private readonly emailConfigService: EmailConfigService) {}

  public async transportEmail(mail: IMessage): Promise<SMTPTransport.SentMessageInfo> {
    const transporter = await this.createTransporter();
    return await transporter.sendMail({
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  }

  private async createTransporter(): Promise<nodemailer.Transporter<SMTPTransport.SentMessageInfo>> {
    const transportConfig = this.emailConfigService.getEmailServiceConfig();
    return nodemailer.createTransport(transportConfig);
  }
}
