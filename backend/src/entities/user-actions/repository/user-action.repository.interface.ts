import { UserActionEntity } from '../user-action.entity.js';

export interface IUserActionRepository {
  saveNewOrUpdatedUserAction(userAction: UserActionEntity): Promise<UserActionEntity>;

  findUserActionWithoutSentMail(userId: string): Promise<UserActionEntity>;

  findAllNonFinishedActionsTwoWeeksOld(): Promise<Array<UserActionEntity>>;
}
