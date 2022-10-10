import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActionEnum } from '../../../enums';
import { getUniqArrayStrings } from '../../../helpers';
import { Constants } from '../../../helpers/constants/constants';
import { UserEntity } from '../../user/user.entity';
import { UserActionEntity } from '../user-action.entity';
import { buildNewConnectionNotFinishedEmailSentAction } from '../utils/build-new-user-action-entity';
import { ICheckUsersActionsAndMailingUsers } from './use-cases-interfaces';

@Injectable()
export class CheckUsersActionsAndMailingUsersUseCase implements ICheckUsersActionsAndMailingUsers {
  constructor(
    @InjectRepository(UserActionEntity)
    private readonly userActionRepository: Repository<UserActionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}
  public async execute(): Promise<Array<string>> {
    console.info('Updating actions with mailing started');
    const nonFinishedUsersActions = await this.findAllNonFinishedActionsTwoWeeksOld();
    const usersWithoutLogs = await this.findUsersWithoutLogs();
    const usersFromActions: Array<UserEntity> = nonFinishedUsersActions.map((action: UserActionEntity) => action.user);
    const allUsersArray: Array<UserEntity> = usersWithoutLogs.concat(usersFromActions);
    const filteredUsers: Array<{ id: string; email: string }> = Array.from(new Set(allUsersArray.map((u) => u.id))).map(
      (id) => {
        return {
          id: id,
          email: allUsersArray.find((u) => u.id === id).email,
        };
      },
    );
    await Promise.allSettled(
      filteredUsers.map(async (u) => {
        await this.updateOrCreateActionForUser(u);
      }),
    );
    const userEmails = filteredUsers.map((u) => u.email);
    return getUniqArrayStrings(userEmails);
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

  private async findAllNonFinishedActionsTwoWeeksOld(): Promise<Array<UserActionEntity>> {
    const notFinishedActionsQb = this.userActionRepository
      .createQueryBuilder('user_action')
      .leftJoinAndSelect('user_action.user', 'user')
      .andWhere('user_action.createdAt <= :date_to', { date_to: Constants.ONE_WEEK_AGO() })
      .andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false })
      .andWhere('user_action.message = :message', { message: UserActionEnum.CONNECTION_CREATION_NOT_FINISHED });
    return await notFinishedActionsQb.getMany();
  }

  private async findUsersWithoutLogs(): Promise<Array<UserEntity>> {
    const usersQb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.groups', 'group')
      .leftJoinAndSelect('group.connection', 'connection')
      .leftJoinAndSelect('connection.logs', 'tableLogs')
      .leftJoinAndSelect('user.user_action', 'user_action')
      .andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false })
      .orWhere('user_action.id is null')
      .andWhere('tableLogs.id is null');
    return await usersQb.getMany();
  }

  private async findUserActionWithoutSentMail(userId: string): Promise<UserActionEntity> {
    const actionQb = this.userActionRepository
      .createQueryBuilder('user_action')
      .leftJoinAndSelect('user_action.user', 'user')
      .andWhere('user.id = :user_id', { user_id: userId })
      .andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false });
    return await actionQb.getOne();
  }
}
