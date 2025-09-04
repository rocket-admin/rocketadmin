import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import Sentry from '@sentry/minimal';
import { Repository } from 'typeorm';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { Constants } from '../../helpers/constants/constants.js';
import { slackPostMessage } from '../../helpers/index.js';
import { ValidationHelper } from '../../helpers/validators/validation-helper.js';
import { EmailService, ICronMessagingResults } from '../email/email/email.service.js';
import {
  ICheckUsersActionsAndMailingUsers,
  ICheckUsersLogsAndUpdateActionsUseCase,
} from '../user-actions/use-cases/use-cases-interfaces.js';
import { JobListEntity } from './job-list.entity.js';
@Injectable()
export class CronJobsService {
  constructor(
    @Inject(UseCaseType.CHECK_USER_LOGS_AND_UPDATE_ACTIONS)
    private readonly checkUsersLogsAndUpdateActionsUseCase: ICheckUsersLogsAndUpdateActionsUseCase,
    @Inject(UseCaseType.CHECK_USER_ACTIONS_AND_MAIL_USERS)
    private readonly checkUsersActionsAndMailingUsersUseCase: ICheckUsersActionsAndMailingUsers,
    @InjectRepository(JobListEntity)
    private readonly jobListRepository: Repository<JobListEntity>,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron(): Promise<void> {
    try {
      const isJobAdded = await this.insertMidnightJob();
      if (!isJobAdded) {
        return;
      }
      await slackPostMessage(`midnight cron started at ${this.getCurrentTime()}`, Constants.EXCEPTIONS_CHANNELS);
      await this.checkUsersLogsAndUpdateActionsUseCase.execute();
      await slackPostMessage(`midnight cron finished at ${this.getCurrentTime()}`, Constants.EXCEPTIONS_CHANNELS);
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleMailingCron(): Promise<void> {
    try {
      const isJobAdded = await this.insertMorningJob();
      if (!isJobAdded) {
        console.log('Job already in progress, exiting');
        return;
      }

      await slackPostMessage(`email cron started at ${this.getCurrentTime()}`, Constants.EXCEPTIONS_CHANNELS);

      try {
        let emails = await this.checkUsersActionsAndMailingUsersUseCase.execute();
        console.log(`Retrieved ${emails.length} email addresses from use case`);
        await slackPostMessage(
          `Successfully retrieved ${emails.length} email addresses from use case`,
          Constants.EXCEPTIONS_CHANNELS,
        );

        const emailsBefore = emails.length;
        emails = emails.filter((email) => {
          return ValidationHelper.isValidEmail(email);
        });
        console.log(`Filtered out ${emailsBefore - emails.length} invalid or demo emails`);

        await slackPostMessage(
          `Found ${emails.length} valid emails. starting messaging`,
          Constants.EXCEPTIONS_CHANNELS,
        );
        const batchSize = 10;
        let allMailingResults = [];

        for (let i = 0; i < emails.length; i += batchSize) {
          const emailsBatch = emails.slice(i, i + batchSize);
          console.log(
            `Processing email batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(emails.length / batchSize)}, with ${emailsBatch.length} emails`,
          );

          try {
            const batchResults = await this.emailService.sendRemindersToUsers(emailsBatch);
            console.log(`Batch ${Math.floor(i / batchSize) + 1} completed with ${batchResults.length} results`);
            allMailingResults = [...allMailingResults, ...batchResults];
          } catch (error) {
            console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
            Sentry.captureException(error);
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log(`Email sending completed. Total results: ${allMailingResults.length}`);

        if (allMailingResults.length === 0) {
          const mailingResultToString = 'Sending emails triggered, but no emails sent (no users found)';
          await slackPostMessage(mailingResultToString, Constants.EXCEPTIONS_CHANNELS);
          await slackPostMessage(`morning cron finished at ${this.getCurrentTime()}`, Constants.EXCEPTIONS_CHANNELS);
        } else {
          await slackPostMessage(`Sent ${allMailingResults.length} emails successfully`, Constants.EXCEPTIONS_CHANNELS);
          // await this.sendEmailResultsToSlack(allMailingResults, emails);
          await slackPostMessage(`morning cron finished at ${this.getCurrentTime()}`, Constants.EXCEPTIONS_CHANNELS);
        }
      } catch (innerError) {
        console.error('Detailed error in email processing:', innerError);
        const errorMessage = innerError.stack
          ? `${innerError.message}\n${innerError.stack.split('\n').slice(0, 5).join('\n')}`
          : innerError.message;
        await slackPostMessage(`Error in email processing: ${errorMessage}`, Constants.EXCEPTIONS_CHANNELS);
        Sentry.captureException(innerError);
      }
    } catch (e) {
      console.error('Main cron handler error:', e);
      const errorMessage = e.stack ? `${e.message}\n${e.stack.split('\n').slice(0, 5).join('\n')}` : e.message;
      await slackPostMessage(`Error in morning cron: ${errorMessage}`, Constants.EXCEPTIONS_CHANNELS);
      Sentry.captureException(e);
    } finally {
      console.log('Cron job completed at', new Date().toISOString());
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  public async clearJobList(): Promise<void> {
    await this.jobListRepository.clear();
  }

  private async insertMidnightJob(): Promise<boolean> {
    return this.insertJobInProgress(Constants.MIDNIGHT_CRON_KEY);
  }

  private async insertMorningJob(): Promise<boolean> {
    return this.insertJobInProgress(Constants.MORNING_CRON_KEY);
  }

  private async insertJobInProgress(jobId: number): Promise<boolean> {
    try {
      await this.jobListRepository.insert({ id: jobId });
      return true;
    } catch (_error) {
      return false;
    }
  }

  private emailCronResultToSlackString(results: Array<ICronMessagingResults>): string | null {
    try {
      let output = '```\n';
      output += 'Idx | Accepted Email                  | Message ID\n';
      output += '----|---------------------------------|------------------------------------------\n';

      results.forEach((result, idx) => {
        const accepted = result.accepted && result.accepted.length > 0 ? result.accepted.join(', ') : '-';
        const messageId = result.messageId ?? '-';
        const idxStr = String(idx + 1).padEnd(3);
        const acceptedStr = accepted.padEnd(32);
        output += `${idxStr} | ${acceptedStr} | ${messageId}\n`;
      });
      output += '```';
      return output;
    } catch (_error) {
      return null;
    }
  }

  private async sendEmailResultsToSlack(
    results: Array<ICronMessagingResults | null>,
    allFoundEmails: Array<string>,
  ): Promise<void> {
    const filteredResults = results.filter((result) => !!result);
    const nullResultsCount = results.length - filteredResults.length;
    const chunkSize = 20;

    const foundEmails = new Set();
    filteredResults.forEach((result) => {
      if (result?.accepted) {
        result.accepted.forEach((email) => foundEmails.add(email));
      }
    });

    const emailsNonFoundInResults = allFoundEmails.filter((email) => !foundEmails.has(email));

    for (let i = 0; i < filteredResults.length; i += chunkSize) {
      const chunk = filteredResults.slice(i, i + chunkSize);
      const message = this.emailCronResultToSlackString(chunk);
      if (!message) {
        continue;
      }
      await slackPostMessage(message, Constants.EXCEPTIONS_CHANNELS);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (nullResultsCount > 0) {
      const timedOutMessage = `The system timed out while sending results to ${nullResultsCount} email addresses`;
      if (emailsNonFoundInResults.length > 100) {
        await slackPostMessage(timedOutMessage, Constants.EXCEPTIONS_CHANNELS);
        for (let i = 0; i < emailsNonFoundInResults.length; i += 100) {
          const emailsChunk = emailsNonFoundInResults.slice(i, i + 100);
          await slackPostMessage(
            `Failed emails (chunk ${i / 100 + 1}): ${emailsChunk.join(', ')}`,
            Constants.EXCEPTIONS_CHANNELS,
          );
        }
      } else {
        const timedOutEmailsMessage = `: \n${emailsNonFoundInResults.join(', ')}\n`;
        const fullTimedOutMessage = `${timedOutMessage}${timedOutEmailsMessage}`;
        await slackPostMessage(fullTimedOutMessage, Constants.EXCEPTIONS_CHANNELS);
      }
    }
  }

  private getCurrentTime(): string {
    return Constants.CURRENT_TIME_FORMATTED();
  }
}
