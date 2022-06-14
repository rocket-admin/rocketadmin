import { CreateUserActionDs } from '../application/data-sctructures/create-user-action.ds';
import { UserEntity } from '../../user/user.entity';
import { UserActionEntity } from '../user-action.entity';
import { UserActionEnum } from '../../../enums';

export function buildNewUserActionEntity(actionData: CreateUserActionDs, user: UserEntity): UserActionEntity {
  const { message } = actionData;
  const newUserAction = new UserActionEntity();
  newUserAction.user = user;
  newUserAction.message = message;
  return newUserAction;
}

export function buildNewConnectionNotFinishedEmailSentAction(user: UserEntity): UserActionEntity {
  const newUserAction = new UserActionEntity();
  newUserAction.user = user;
  newUserAction.message = UserActionEnum.CONNECTION_CREATION_NOT_FINISHED;
  newUserAction.mail_sent = true;
  return newUserAction;
}
