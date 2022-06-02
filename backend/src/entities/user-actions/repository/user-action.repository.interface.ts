import { UserActionEntity } from '../user-action.entity';

export interface IUserActionRepository {
  saveNewOrUpdatedUserAction(userAction: UserActionEntity): Promise<UserActionEntity>;
}
