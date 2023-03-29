import { SubscriptionLevelEnum } from '../../../../enums/subscription-level.enum.js';
import { ProcessedStripeWebhook } from '../data-structures/processed-stripe-webhook.ds.js';
import { StripeWebhookDS } from '../data-structures/stripe-webhook.ds.js';

export interface ISubscriptionUpgradeResult {
  success: boolean;
  message: string;
}

export interface IStripeSerice {
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
}
