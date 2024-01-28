import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import Sentry from '@sentry/minimal';
import { Repository } from 'typeorm';
import { UseCaseType } from '../../common/data-injection.tokens.js';
import { slackPostMessage } from '../../helpers/index.js';
import { Constants } from '../../helpers/constants/constants.js';
import { sendRemindersToUsers } from '../email/utils/send-reminders-to-users.js';
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
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron(): Promise<void> {
    try {
      const isJobAdded = await this.insertMidnightJob();
      if (!isJobAdded) {
        await slackPostMessage('duplicated midnight cron job cron not started', Constants.EXCEPTIONS_CHANNELS);
        return;
      }
      console.info('midnight cron started');
      await slackPostMessage('midnight cron started', Constants.EXCEPTIONS_CHANNELS);
      await this.checkUsersLogsAndUpdateActionsUseCase.execute();
      await slackPostMessage('midnight cron finished', Constants.EXCEPTIONS_CHANNELS);
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
        await slackPostMessage('duplicated morning cron job cron not started', Constants.EXCEPTIONS_CHANNELS);
        return;
      }
      await slackPostMessage(
        'started checking user actions and finding emails for messaging',
        Constants.EXCEPTIONS_CHANNELS,
      );
      const emails = await this.checkUsersActionsAndMailingUsersUseCase.execute();
      await slackPostMessage(`found ${emails.length} emails. starting messaging`, Constants.EXCEPTIONS_CHANNELS);
      const mailingResults = await sendRemindersToUsers(emails);
      if (mailingResults.length === 0) {
        const mailingResultToString = 'Sending emails triggered, but no emails sent (no users found)';
        await slackPostMessage(mailingResultToString, Constants.EXCEPTIONS_CHANNELS);
        await slackPostMessage('morning cron finished', Constants.EXCEPTIONS_CHANNELS);
      } else {
        const mailingResultToString = JSON.stringify(mailingResults);
        await slackPostMessage(mailingResultToString, Constants.EXCEPTIONS_CHANNELS);
        await slackPostMessage('morning cron finished', Constants.EXCEPTIONS_CHANNELS);
      }
    } catch (e) {
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
    } catch (error) {
      return false;
    }
  }
}
