import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mail from 'nodemailer/lib/mailer';
import PQueue from 'p-queue';
import { Logger } from '../../../helpers/logging/Logger.js';
import { send2faEnabledInCompanyToUser } from '../send-email.js';

export async function send2faEnabledInCompany(
  userEmails: Array<string>,
  companyName: string,
): Promise<Array<SMTPTransport.SentMessageInfo | void>> {
  try {
    const queue = new PQueue({ concurrency: 3 });

    const mailingResults: Array<SMTPTransport.SentMessageInfo | void> = await Promise.all(
      userEmails.map(async (email: string) => {
        return await queue.add(async () => {
          return await send2faEnabledInCompanyToUser(email, companyName);
        });
      }),
    );
    return mailingResults;
  } catch (error) {
    Logger.logError(error);
  }
}
