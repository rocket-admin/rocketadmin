import { SubscriptionLevelEnum } from '../../../enums';
import { isSaaS } from '../../../helpers/app/is-saas';
import { getStripe } from './get-stripe';
import { getSubscriptionLevelFromPriceId } from './get-subscription-level-from-price-id';

export async function getCurrentUserSubscription(userStripeId: string): Promise<SubscriptionLevelEnum> {
  if (process.env.NODE_ENV === 'test' || !isSaaS()) return;
  if (!userStripeId) {
    return SubscriptionLevelEnum.FREE_PLAN;
  }
  const stripe = getStripe();
  const userSubscriptions = await stripe.subscriptions.list({ customer: userStripeId });
  const userSubscriptionPriceId = userSubscriptions?.data[0]?.items?.data[0]?.price?.id;
  return getSubscriptionLevelFromPriceId(userSubscriptionPriceId);
}
