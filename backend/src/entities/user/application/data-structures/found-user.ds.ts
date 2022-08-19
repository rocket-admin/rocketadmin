import { SubscriptionLevelEnum } from '../../../../enums';

export class FoundUserDs {
  id: string;
  isActive: boolean;
  email: string;
  createdAt: Date;
  portal_link?: string;
  subscriptionLevel?: SubscriptionLevelEnum;
  intercom_hash?: string;
}
