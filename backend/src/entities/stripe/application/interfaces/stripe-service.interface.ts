import { SubscriptionLevelEnum } from '../../../../enums/subscription-level.enum.js';
import { UserEntity } from '../../../user/user.entity.js';
import { ProcessedStripeWebhook } from '../data-structures/processed-stripe-webhook.ds.js';
import { StripeWebhookDS } from '../data-structures/stripe-webhook.ds.js';

export interface ISubscriptionUpgradeResult {
  success: boolean;
  message: string;
}

export interface ICreatedStripeSetupIntent {
  client_secret: string;
  id: string;
}

export interface IStripeService {
  processStripeWebhook(inputData: StripeWebhookDS): ProcessedStripeWebhook | null;

  createStripeUsageRecord(
    ownerSubscriptionLevel: SubscriptionLevelEnum,
    numberOfUsers: number,
    ownerStripeCustomerId: string,
  ): Promise<void>;

  getCurrentUserSubscription(userStripeId: string): Promise<SubscriptionLevelEnum>;

  upgradeUserSubscription(
    subscriptionLevel: SubscriptionLevelEnum,
    userStripeId: string,
  ): Promise<ISubscriptionUpgradeResult>;

  createPortalLink(user: UserEntity): Promise<string>;

  createStripeSetupIntent(userStripeId: string): Promise<ICreatedStripeSetupIntent | null>;

  attachStripeSetupIntentToCustomer(
    userStripeId: string,
    defaultPaymentMethodId: string,
    subscriptionLevel: SubscriptionLevelEnum,
  ): Promise<ISubscriptionUpgradeResult>;

  createStripeCustomer(userId: string, userEmail: string): Promise<string>;
}
