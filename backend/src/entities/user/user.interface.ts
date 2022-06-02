import { SubscriptionLevelEnum } from '../../enums';

export interface IUserData {
  id: string;
}

export interface IUserInfo {
  id: string;
  isActive: boolean;
  email: string;
  createdAt: Date;
  portal_link?: string;
  subscriptionLevel: SubscriptionLevelEnum;
}

export interface IUserRO {
  email?: string;
  user: IUserData;
}
