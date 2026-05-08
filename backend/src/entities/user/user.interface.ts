import { SubscriptionLevelEnum } from '../../enums/subscription-level.enum.js';

export interface IUserInfo {
	id: string;
	isActive: boolean;
	email: string;
	createdAt: Date;
	portal_link?: string;
	subscriptionLevel: SubscriptionLevelEnum;
	name: string;
}
