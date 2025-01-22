import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { IMessage } from '../email/email.interface.js';
import { EmailConfigService } from '../email-config/email-config.service.js';
import { IEmailTransporterInterface } from './email-transporter.interface.js';
import { Injectable } from '@nestjs/common';
@Injectable()
export class EmailTransporterService implements IEmailTransporterInterface {
  private transporter: nodemailer.Transporter;
  constructor(private readonly emailConfigService: EmailConfigService) {
    this.transporter = this.createTransporter();
  }

  public async transportEmail(mail: IMessage): Promise<SMTPTransport.SentMessageInfo> {
    return await this.transporter.sendMail({
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  }

  private createTransporter(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> {
    const transportConfig = this.emailConfigService.getEmailServiceConfig();
    return nodemailer.createTransport(transportConfig);
  }
}
