import { getCurrentUserSubscription } from '../../stripe/stripe-helpers/get-current-user-subscription';
import { FoundUserInGroupDs } from '../application/data-structures/found-user-in-group.ds';
import { FoundUserDs } from '../application/data-structures/found-user.ds';
import { UserEntity } from '../user.entity';
import { getUserIntercomHash } from './get-user-intercom-hash';
import { StripeUtil } from './stripe-util';

export function buildFoundUserInGroupDs(user: UserEntity): FoundUserInGroupDs {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    isActive: user.isActive,
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
