import { HttpException, HttpStatus } from '@nestjs/common';
import Sentry from '@sentry/node';
import { SubscriptionLevelEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { getPriceId } from './get-price-id.js';
import { getStripe } from './get-stripe.js';

export async function createStripeUsageRecord(
  ownerSubscriptionLevel: SubscriptionLevelEnum,
  numberOfUsers: number,
): Promise<void> {
  if (!isSaaS() || ownerSubscriptionLevel === SubscriptionLevelEnum.FREE_PLAN) {
    return;
  }
  const stripe = getStripe();
  const subscriptionId = getPriceId(ownerSubscriptionLevel);
  if (!subscriptionId) {
    return;
  }
  try {
    await stripe.subscriptionItems.createUsageRecord(subscriptionId, {
      quantity: numberOfUsers,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error(`Error in creation stripe record: ${error}`);
    throw new HttpException(
      {
        message: Messages.FAILED_CREATE_SUBSCRIPTION_LOG,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  return;
}
