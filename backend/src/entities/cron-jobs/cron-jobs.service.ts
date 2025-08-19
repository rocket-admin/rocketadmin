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
      await slackPostMessage(
        `midnight cron started at ${Constants.CURRENT_TIME_FORMATTED()}`,
        Constants.EXCEPTIONS_CHANNELS,
      );
      await this.checkUsersLogsAndUpdateActionsUseCase.execute();
      await slackPostMessage(
        `midnight cron finished at ${Constants.CURRENT_TIME_FORMATTED()}`,
        Constants.EXCEPTIONS_CHANNELS,
      );
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
        return;
      }

      await slackPostMessage(
        `email cron started at ${Constants.CURRENT_TIME_FORMATTED()}`,
        Constants.EXCEPTIONS_CHANNELS,
      );

      let emails = await this.checkUsersActionsAndMailingUsersUseCase.execute();
      emails = emails.filter((email) => {
        if (email && /^demo_.*@rocketadmin\.com$/i.test(email)) {
          return false;
        }
        return ValidationHelper.isValidEmail(email);
      });

      await slackPostMessage(`found ${emails.length} valid emails. starting messaging`, Constants.EXCEPTIONS_CHANNELS);
      const mailingResults = await this.emailService.sendRemindersToUsers(emails);
      if (mailingResults.length === 0) {
        const mailingResultToString = 'Sending emails triggered, but no emails sent (no users found)';
        await slackPostMessage(mailingResultToString, Constants.EXCEPTIONS_CHANNELS);
        await slackPostMessage(
          `morning cron finished at ${Constants.CURRENT_TIME_FORMATTED()}`,
          Constants.EXCEPTIONS_CHANNELS,
        );
      } else {
        await slackPostMessage(JSON.stringify(mailingResults), Constants.EXCEPTIONS_CHANNELS);
        // await this.sendEmailResultsToSlack(mailingResults, emails);
        await slackPostMessage(
          `morning cron finished at ${Constants.CURRENT_TIME_FORMATTED()}`,
          Constants.EXCEPTIONS_CHANNELS,
        );
      }
    } catch (e) {
      await slackPostMessage(`Error in morning cron: ${e.message}`, Constants.EXCEPTIONS_CHANNELS);
      Sentry.captureException(e);
      console.error(e);
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
    const emailsNonFoundInResults = allFoundEmails.filter(
      (email) => !filteredResults.some((result) => result?.accepted?.includes(email)),
    );
    for (let i = 0; i < filteredResults.length; i += chunkSize) {
      const chunk = filteredResults.slice(i, i + chunkSize);
      const message = this.emailCronResultToSlackString(chunk);
      if (!message) {
        continue;
      }
      await slackPostMessage(message, Constants.EXCEPTIONS_CHANNELS);
    }
    if (nullResultsCount > 0) {
      const timedOutMessage = `The system timed out while sending results to ${nullResultsCount} email addresses`;
      const timedOutEmailsMessage = `: \n${emailsNonFoundInResults.join(', ')}\n`;
      const fullTimedOutMessage = `${timedOutMessage}${timedOutEmailsMessage}`;
      await slackPostMessage(fullTimedOutMessage, Constants.EXCEPTIONS_CHANNELS);
    }
  }
}
