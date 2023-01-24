import { getCurrentUserSubscription } from '../../stripe/stripe-helpers/get-current-user-subscription.js';
import { FoundUserInGroupDs } from '../application/data-structures/found-user-in-group.ds.js';
import { FoundUserDs } from '../application/data-structures/found-user.ds.js';
import { UserEntity } from '../user.entity.js';
import { getUserIntercomHash } from './get-user-intercom-hash.js';
import { StripeUtil } from './stripe-util.js';

export function buildFoundUserInGroupDs(user: UserEntity): FoundUserInGroupDs {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    isActive: user.isActive,
    name: user.name,
  };
}

export async function buildFoundUserDs(user: UserEntity): Promise<FoundUserDs> {
  const portalLink = await StripeUtil.createPortalLink(user);
  const userSubscriptionLevel = await getCurrentUserSubscription(user.stripeId);
  const intercomHash = getUserIntercomHash(user.id);
  return {
    id: user.id,
    createdAt: user.createdAt,
    isActive: user.isActive,
    email: user.email,
    portal_link: portalLink,
    subscriptionLevel: userSubscriptionLevel,
    intercom_hash: intercomHash,
    name: user.name,
  };
}
