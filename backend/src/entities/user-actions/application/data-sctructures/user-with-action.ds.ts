import { UserActionEntity } from '../../user-action.entity.js';

export class UserWithActionDs {
  email: string;
  user_action: UserActionEntity | null;
  userId: string;
}
