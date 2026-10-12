import { UserActionEnum } from '../../../enums/user-action.enum.js';
import { UserEntity } from '../../user/user.entity.js';
import { UserActionEntity } from '../user-action.entity.js';

export function buildNewConnectionNotFinishedEmailSentAction(user: UserEntity): UserActionEntity {
	const newUserAction = new UserActionEntity();
	newUserAction.user = user;
	newUserAction.message = UserActionEnum.CONNECTION_CREATION_NOT_FINISHED;
	newUserAction.mail_sent = true;
	return newUserAction;
}
