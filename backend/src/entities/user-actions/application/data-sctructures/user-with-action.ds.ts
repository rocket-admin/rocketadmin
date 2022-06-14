import { UserActionEntity } from '../../user-action.entity';

export class UserWithActionDs {
  email: string;
  user_action: UserActionEntity | null;
  userId: string;
}
