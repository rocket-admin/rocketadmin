import { Global, Module } from '@nestjs/common';
import { UserActionModule } from '../user-actions/user-action.module';
import { UseCaseType } from '../../common/data-injection.tokens';
import { CheckUsersLogsAndUpdateActionsUseCase } from '../user-actions/use-cases/check-users-logs-and-update-actions.use.case';
import { CheckUsersActionsAndMailingUsersUseCase } from '../user-actions/use-cases/check-users-actions-and-mailing-users.use.case';
import { CronJobsService } from './cron-jobs.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserActionEntity } from '../user-actions/user-action.entity';
import { UserEntity } from '../user/user.entity';
import { JobListEntity } from './job-list.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserActionEntity, UserEntity, JobListEntity]), UserActionModule],
  providers: [
    CronJobsService,
    {
      provide: UseCaseType.CHECK_USER_LOGS_AND_UPDATE_ACTIONS,
      useClass: CheckUsersLogsAndUpdateActionsUseCase,
    },
    {
      provide: UseCaseType.CHECK_USER_ACTIONS_AND_MAIL_USERS,
      useClass: CheckUsersActionsAndMailingUsersUseCase,
    },
  ],
  exports: [CronJobsService],
})
export class CronJobsModule {}
