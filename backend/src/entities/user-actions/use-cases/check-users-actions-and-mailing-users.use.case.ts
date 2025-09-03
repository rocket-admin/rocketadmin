import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActionEnum } from '../../../enums/index.js';
import { getUniqArrayStrings } from '../../../helpers/index.js';
import { Constants } from '../../../helpers/constants/constants.js';
import { UserEntity } from '../../user/user.entity.js';
import { UserActionEntity } from '../user-action.entity.js';
import { buildNewConnectionNotFinishedEmailSentAction } from '../utils/build-new-user-action-entity.js';
import { ICheckUsersActionsAndMailingUsers } from './use-cases-interfaces.js';
import PQueue from 'p-queue';
import Sentry from '@sentry/minimal';
@Injectable()
export class CheckUsersActionsAndMailingUsersUseCase implements ICheckUsersActionsAndMailingUsers {
  constructor(
    @InjectRepository(UserActionEntity)
    private readonly userActionRepository: Repository<UserActionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}
  public async execute(): Promise<Array<string>> {
    try {
      const distinctUsers = await this.findDistinctUsersForProcessing();
      const batchSize = 10;
      const queue = new PQueue({ concurrency: 3 });
      const emails: string[] = [];

      try {
        for (let i = 0; i < distinctUsers.length; i += batchSize) {
          const batch = distinctUsers.slice(i, i + batchSize);
          await Promise.all(
            batch.map((user) =>
              queue.add(async () => {
                await this.updateOrCreateActionForUser(user);
                if (user.email) {
                  emails.push(user.email.toLowerCase());
                }
              }),
            ),
          );
        }

        await queue.onIdle();
      } finally {
        queue.clear();
      }

      return getUniqArrayStrings(emails);
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
      return [];
    }
  }

  private async updateOrCreateActionForUser(u: { id: string; email: string }): Promise<void> {
    const userActionForUser = await this.findUserActionWithoutSentMail(u.id);
    if (userActionForUser) {
      if (!userActionForUser.mail_sent) {
        userActionForUser.mail_sent = true;
        await this.userActionRepository.save(userActionForUser);
      } else {
        return;
      }
    }
    const foundUser = await this.userRepository.findOne({ where: { id: u.id } });
    const newUserActionEntity = buildNewConnectionNotFinishedEmailSentAction(foundUser);
    await this.userActionRepository.save(newUserActionEntity);
  }

  private async findUserActionWithoutSentMail(userId: string): Promise<UserActionEntity> {
    const actionQb = this.userActionRepository
      .createQueryBuilder('user_action')
      .leftJoinAndSelect('user_action.user', 'user')
      .andWhere('user.id = :user_id', { user_id: userId })
      .andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false });
    return await actionQb.getOne();
  }

  private async findDistinctUsersForProcessing(): Promise<Array<{ id: string; email: string }>> {
    const nonFinishedActionsQuery = this.userActionRepository
      .createQueryBuilder('user_action')
      .select(['user.id as id', 'user.email as email'])
      .innerJoin('user_action.user', 'user')
      .where('user.isDemoAccount = :isDemoAccount', { isDemoAccount: false })
      .andWhere('user_action.createdAt <= :date_to', { date_to: Constants.ONE_WEEK_AGO() })
      .andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false })
      .andWhere('user_action.message = :message', { message: UserActionEnum.CONNECTION_CREATION_NOT_FINISHED });

    const usersWithoutLogsQuery = this.userRepository
      .createQueryBuilder('user')
      .select(['user.id as id', 'user.email as email'])
      .leftJoin('user.groups', 'group')
      .leftJoin('group.connection', 'connection')
      .leftJoin('connection.logs', 'tableLogs')
      .leftJoin('user.user_action', 'user_action')
      .where('user.isDemoAccount = :isDemoAccount', { isDemoAccount: false })
      .andWhere('(user_action.mail_sent = :mail_sent OR user_action.id is null)', { mail_sent: false })
      .andWhere('tableLogs.id is null');

    const nonFinishedUsersResult = await nonFinishedActionsQuery.getRawMany();
    const usersWithoutLogsResult = await usersWithoutLogsQuery.getRawMany();

    const combinedUsers = [...nonFinishedUsersResult, ...usersWithoutLogsResult];
    const uniqueUsersMap = new Map<string, { id: string; email: string }>();

    combinedUsers.forEach((user) => {
      if (!uniqueUsersMap.has(user.id)) {
        uniqueUsersMap.set(user.id, { id: user.id, email: user.email });
      }
    });

    return Array.from(uniqueUsersMap.values());
  }
}
