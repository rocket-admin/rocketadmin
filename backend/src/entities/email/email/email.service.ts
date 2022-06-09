import { IEmailService, IMessage } from './email.interface';
import { EmailTransporterService } from '../transporter/email-transporter-service';
import { EmailGenerator } from './email.generator';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailLetter } from '../email-messages/email-message';

export class EmailService implements IEmailService {
  constructor(private emailGenerator: EmailGenerator, private emailTransporterService: EmailTransporterService) {}

  public async sendMail(letterContent: IMessage): Promise<SMTPTransport.SentMessageInfo> {
    const testEmail = new EmailLetter({
      from: letterContent.from,
      to: letterContent.to,
      subject: letterContent.subject,
      text: letterContent.text,
    });

    const emailMessage = this.emailGenerator.generateEmail(testEmail);
    return await this.emailTransporterService.transportEmail(emailMessage);
  }
}
