import { UserActionEnum } from '../../../enums';
import { Constants } from '../../../helpers/constants/constants';
import { UserActionEntity } from '../user-action.entity';

export const userActionCustomRepositoryExtension = {
  async saveNewOrUpdatedUserAction(userAction: UserActionEntity): Promise<UserActionEntity> {
    return await this.save(userAction);
  },

  async findUserActionWithoutSentMail(userId: string): Promise<UserActionEntity> {
    const actionQb = this.createQueryBuilder('user_action')
      .leftJoinAndSelect('user_action.user', 'user')
      .andWhere('user.id = :user_id', { user_id: userId })
      .andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false });
    return await actionQb.getOne();
  },

  async findAllNonFinishedActionsTwoWeeksOld(): Promise<Array<UserActionEntity>> {
    const notFinishedActionsQb = this.createQueryBuilder('user_action')
      .leftJoinAndSelect('user_action.user', 'user')
      .andWhere('user_action.createdAt <= :date_to', { date_to: Constants.ONE_WEEK_AGO() })
      .andWhere('user_action.mail_sent = :mail_sent', { mail_sent: false })
      .andWhere('user_action.message = :message', { message: UserActionEnum.CONNECTION_CREATION_NOT_FINISHED });
    return await notFinishedActionsQb.getMany();
  },
};
