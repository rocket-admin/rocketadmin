import { IEmailService, IMessage } from './email.interface.js';
import { EmailTransporterService } from '../transporter/email-transporter-service.js';
import { EmailGenerator } from './email.generator.js';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailLetter } from '../email-messages/email-message.js';

export class EmailService implements IEmailService {
  constructor(private emailGenerator: EmailGenerator, private emailTransporterService: EmailTransporterService) {}

  public async sendMail(letterContent: IMessage): Promise<SMTPTransport.SentMessageInfo> {
    const testEmail = new EmailLetter({
      from: letterContent.from,
      to: letterContent.to,
      subject: letterContent.subject,
      text: letterContent.text,
      html: letterContent.html,
    });

    const emailMessage = this.emailGenerator.generateEmail(testEmail);
    return await this.emailTransporterService.transportEmail(emailMessage);
  }
}
