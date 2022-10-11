import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogOperationTypeEnum, OperationResultStatusEnum, UserActionEnum } from '../../../enums';
import { getUniqArrayStrings } from '../../../helpers';
import { Constants } from '../../../helpers/constants/constants';
import { TableLogsEntity } from '../../table-logs/table-logs.entity';
import { UserActionEntity } from '../user-action.entity';
import { ICheckUsersLogsAndUpdateActionsUseCase } from './use-cases-interfaces';

@Injectable()
export class CheckUsersLogsAndUpdateActionsUseCase implements ICheckUsersLogsAndUpdateActionsUseCase {
  constructor(
    @InjectRepository(UserActionEntity)
    private readonly userActionRepository: Repository<UserActionEntity>,
    @InjectRepository(TableLogsEntity)
    private readonly tableLogsRepository: Repository<TableLogsEntity>,
  ) {}
  public async execute(): Promise<void> {
    console.info('Updating actions started');
    const foundActions: Array<UserActionEntity> = await this.findAllNonFinishedActionsTwoWeeksOld();
    const userIdsFromActions: Array<string> = foundActions.map((action: UserActionEntity) => action.user.id);
    const filteredIds: Array<string> = getUniqArrayStrings(userIdsFromActions);
    await Promise.allSettled(
      filteredIds.map(async (id: string) => {
        await this.checkUserLogsAndUpdateAction(id);
      }),
    );
  }

  private async checkUserLogsAndUpdateAction(userId: string): Promise<void> {
    const successFullTableReceivingUserLogs = await this.findSuccessfulTableReceivingUserLogs(userId);
    if (!successFullTableReceivingUserLogs || successFullTableReceivingUserLogs.length === 0) {
      return;
    }
    const foundUserAction = await this.findNonFinishedConnectionCreationUserAction(userId);
    if (!foundUserAction) {
      return;
    }
    foundUserAction.message = UserActionEnum.CONNECTION_CREATION_FINISHED;
    await this.userActionRepository.save(foundUserAction);
  }

  private async findAllNonFinishedActionsTwoWeeksOld(): Promise<Array<UserActionEntity>> {
    const notFinishedActionsQb = this.userActionRepository
      .createQueryBuilder('user_action')
      .leftJoinAndSelect('user_action.user', 'user')
      .andWhere('user_action.createdAt <= :date_to', { date_to: Constants.ONE_WEEK_AGO() })
      .andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false })
      .andWhere('user_action.message = :message', { message: UserActionEnum.CONNECTION_CREATION_NOT_FINISHED });
    return await notFinishedActionsQb.getMany();
  }

  private async findSuccessfulTableReceivingUserLogs(userId: string): Promise<Array<TableLogsEntity>> {
    const userLogsQB = this.tableLogsRepository
      .createQueryBuilder('tableLogs')
      .leftJoinAndSelect('tableLogs.connection_id', 'connection')
      .leftJoinAndSelect('connection.groups', 'group')
      .leftJoinAndSelect('group.users', 'user')
      .andWhere('user.id = :user_id', { user_id: userId })
      .andWhere('tableLogs.operationType = :operationType', { operationType: LogOperationTypeEnum.rowsReceived })
      .andWhere('tableLogs.operationStatusResult = :operationStatusResult', {
        operationStatusResult: OperationResultStatusEnum.successfully,
      });
    return await userLogsQB.getMany();
  }

  private async findNonFinishedConnectionCreationUserAction(userId: string): Promise<UserActionEntity> {
    const actionQb = this.userActionRepository
      .createQueryBuilder('user_action')
      .leftJoinAndSelect('user_action.user', 'user')
      .andWhere('user.id = :user_id', { user_id: userId })
      .andWhere('user_action.message = :message', { message: UserActionEnum.CONNECTION_CREATION_NOT_FINISHED });
    return await actionQb.getOne();
  }
}
