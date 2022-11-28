import { HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { SubscriptionLevelEnum } from '../../../enums';
import { Messages } from '../../../exceptions/text/messages';
import { getPriceId } from './get-price-id';
import { getStripe } from './get-stripe';

export async function createStripeUsageRecord(
  ownerSubscriptionLevel: SubscriptionLevelEnum,
  numberOfUsers: number,
): Promise<void> {
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
    console.error(`Error in creation stripe record: ${error.message}`);
    throw new HttpException(
      {
        message: Messages.FAILED_CREATE_SUBSCRIPTION_LOG,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  return;
}
