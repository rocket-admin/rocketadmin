import { SubscriptionLevelEnum } from '../../../../enums/subscription-level.enum.js';
export class UserInfoRO {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  role: string;
  email: string;
}

export class FoundSassCompanyInfoDS {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  portal_link?: string;
  subscriptionLevel?: SubscriptionLevelEnum;
  is_payment_method_added?: boolean;
}
