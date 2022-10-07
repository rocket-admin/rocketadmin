import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UseCaseType } from '../../common/data-injection.tokens';
import { TableLogsEntity } from '../table-logs/table-logs.entity';
import { CheckUsersActionsAndMailingUsersUseCase } from '../user-actions/use-cases/check-users-actions-and-mailing-users.use.case';
import { CheckUsersLogsAndUpdateActionsUseCase } from '../user-actions/use-cases/check-users-logs-and-update-actions.use.case';
import { UserActionEntity } from '../user-actions/user-action.entity';
import { UserActionModule } from '../user-actions/user-action.module';
import { UserEntity } from '../user/user.entity';
import { CronJobsService } from './cron-jobs.service';
import { JobListEntity } from './job-list.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserActionEntity, UserEntity, JobListEntity, TableLogsEntity]), UserActionModule],
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
