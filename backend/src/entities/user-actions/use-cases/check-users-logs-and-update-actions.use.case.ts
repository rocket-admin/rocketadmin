import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogOperationTypeEnum, OperationResultStatusEnum, UserActionEnum } from '../../../enums/index.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { TableLogsEntity } from '../../table-logs/table-logs.entity.js';
import { UserActionEntity } from '../user-action.entity.js';
import { ICheckUsersLogsAndUpdateActionsUseCase } from './use-cases-interfaces.js';

@Injectable()
export class CheckUsersLogsAndUpdateActionsUseCase implements ICheckUsersLogsAndUpdateActionsUseCase {
  constructor(
    @InjectRepository(UserActionEntity)
    private readonly userActionRepository: Repository<UserActionEntity>,
    @InjectRepository(TableLogsEntity)
    private readonly tableLogsRepository: Repository<TableLogsEntity>,
  ) {}
  public async execute(): Promise<void> {
    const uniqueUserIds: Array<string> = await this.findDistinctUserIdsWithNonFinishedActions();

    const batchSize = 3;
    for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
      const batch = uniqueUserIds.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (id: string) => {
          await this.checkUserLogsAndUpdateAction(id);
        }),
      );
    }
  }

  private async checkUserLogsAndUpdateAction(userId: string): Promise<void> {
    const hasSuccessfulTableReceivingLogs = await this.findSuccessfulTableReceivingUserLogs(userId);
    if (!hasSuccessfulTableReceivingLogs) {
      return;
    }
    const foundUserAction = await this.findNonFinishedConnectionCreationUserAction(userId);
    if (!foundUserAction) {
      return;
    }
    foundUserAction.message = UserActionEnum.CONNECTION_CREATION_FINISHED;
    await this.userActionRepository.save(foundUserAction);
  }

  private async findDistinctUserIdsWithNonFinishedActions(): Promise<Array<string>> {
    const result = await this.userActionRepository
      .createQueryBuilder('user_action')
      .select('DISTINCT user.id', 'userId')
      .leftJoin('user_action.user', 'user')
      .where('user_action.createdAt <= :date_to', { date_to: Constants.ONE_WEEK_AGO() })
      .andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false })
      .andWhere('user_action.message = :message', { message: UserActionEnum.CONNECTION_CREATION_NOT_FINISHED })
      .getRawMany();

    return result.map((item) => item.userId);
  }

  private async findSuccessfulTableReceivingUserLogs(userId: string): Promise<boolean> {
    const userLogsCount = await this.tableLogsRepository
      .createQueryBuilder('tableLogs')
      .leftJoin('tableLogs.connection_id', 'connection')
      .leftJoin('connection.groups', 'group')
      .leftJoin('group.users', 'user')
      .where('user.id = :user_id', { user_id: userId })
      .andWhere('tableLogs.operationType = :operationType', { operationType: LogOperationTypeEnum.rowsReceived })
      .andWhere('tableLogs.operationStatusResult = :operationStatusResult', {
        operationStatusResult: OperationResultStatusEnum.successfully,
      })
      .select('1')
      .limit(1)
      .getRawOne();
    return !!userLogsCount;
  }

  private async findNonFinishedConnectionCreationUserAction(userId: string): Promise<UserActionEntity> {
    const actionQb = this.userActionRepository
      .createQueryBuilder('user_action')
      .leftJoin('user_action.user', 'user')
      .andWhere('user.id = :user_id', { user_id: userId })
      .andWhere('user_action.message = :message', { message: UserActionEnum.CONNECTION_CREATION_NOT_FINISHED });
    return await actionQb.getOne();
  }
}
