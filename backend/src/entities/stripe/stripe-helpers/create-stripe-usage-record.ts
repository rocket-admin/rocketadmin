import { HttpException, HttpStatus } from '@nestjs/common';
import Sentry from '@sentry/node';
import Stripe from 'stripe';
import { SubscriptionLevelEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { getPriceId } from './get-price-id.js';
import { getStripe } from './get-stripe.js';

export async function createStripeUsageRecord(
  ownerSubscriptionLevel: SubscriptionLevelEnum,
  numberOfUsers: number,
  ownerStripeCustomerId: string,
): Promise<void> {
  if (!isSaaS() || ownerSubscriptionLevel === SubscriptionLevelEnum.FREE_PLAN) {
    return;
  }
  const stripe = getStripe();
  const subscriptionId = getPriceId(ownerSubscriptionLevel);
  if (!subscriptionId) {
    return;
  }
  const dataOfCurrentCustomer = await stripe.customers.retrieve(ownerStripeCustomerId);
  if (!isStripeCustomer(dataOfCurrentCustomer)) {
    throw new HttpException(
      {
        message: Messages.FAILED_CREATE_SUBSCRIPTION_LOG,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  const subscriptionItem = dataOfCurrentCustomer.subscriptions.data[0].items.data[0];
  if (!subscriptionItem) {
    throw new HttpException(
      {
        message: 'No customer subscription item found',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  try {
    await stripe.subscriptionItems.createUsageRecord(subscriptionItem.id, {
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

function isStripeCustomer(
  T: Stripe.Response<Stripe.Customer | Stripe.DeletedCustomer>,
): T is Stripe.Response<Stripe.Customer> {
  return !T.deleted;
}
