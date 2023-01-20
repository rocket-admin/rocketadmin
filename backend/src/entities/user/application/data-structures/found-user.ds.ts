import { SubscriptionLevelEnum } from '../../../../enums/index.js';

export class FoundUserDs {
  id: string;
  isActive: boolean;
  email: string;
  createdAt: Date;
  portal_link?: string;
  subscriptionLevel?: SubscriptionLevelEnum;
  intercom_hash?: string;
  name: string;
}
