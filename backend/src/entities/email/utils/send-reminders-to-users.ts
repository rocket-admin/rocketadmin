import * as SMTPTransport from 'nodemailer/lib/smtp-transport';
import PQueue from 'p-queue';
import { sendReminderToUser } from '../send-email';
import * as Mail from 'nodemailer/lib/mailer';

export async function sendRemindersToUsers(userEmails: Array<string>): Promise<Array<ICronMessagingResults>> {
  const queue = new PQueue({ concurrency: 8 });
  const mailingResults: Array<SMTPTransport.SentMessageInfo> = await Promise.all(
    userEmails.map(async (email: string, index) => {
      return await queue.add(async () => {
        const result = await sendReminderToUser(email);
        console.log(`${index} email sending result ${JSON.stringify(result)}`);
        return result;
      });
    }),
  );
  return buildMailingResults(mailingResults);
}

function buildMailingResults(results: Array<SMTPTransport.SentMessageInfo>): Array<ICronMessagingResults> {
  return results.map((result) => {
    const { messageId, accepted, rejected } = result;
    return {
      messageId: messageId ? messageId : undefined,
      accepted: accepted ? accepted : undefined,
      rejected: rejected ? rejected : undefined,
    };
  });
}

interface ICronMessagingResults {
  messageId?: string;
  accepted?: Array<string | Mail.Address>;
  rejected?: Array<string | Mail.Address>;
}
