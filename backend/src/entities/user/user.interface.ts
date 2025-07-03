import { SubscriptionLevelEnum } from '../../enums/index.js';

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
  name: string;
}

