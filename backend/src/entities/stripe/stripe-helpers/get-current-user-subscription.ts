import { SubscriptionLevelEnum } from '../../../enums';
import { isSaaS } from '../../../helpers/app/is-saas';
import { getStripe } from './get-stripe';
import { getSubscriptionLevelFromPriceId } from './get-subscription-level-from-price-id';

export async function getCurrentUserSubscription(userStripeId: string): Promise<SubscriptionLevelEnum> {
  if (process.env.NODE_ENV === 'test' || !isSaaS() || !userStripeId) return;
  const stripe = getStripe();
  const userSubscriptions = await stripe.subscriptions.list({ customer: userStripeId });
  console.log("🚀 ~ file: get-current-user-subscription.ts:10 ~ getCurrentUserSubscription ~ userSubscriptions", userSubscriptions)
  const userSubscriptionPriceId = userSubscriptions?.data[0]?.items?.data[0]?.price?.id;
  console.log("🚀 ~ file: get-current-user-subscription.ts:12 ~ getCurrentUserSubscription ~ userSubscriptionPriceId", userSubscriptionPriceId)
  return getSubscriptionLevelFromPriceId(userSubscriptionPriceId);
}
