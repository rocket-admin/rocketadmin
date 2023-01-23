import { HttpException, HttpStatus } from '@nestjs/common';
import { SubscriptionLevelEnum } from '../../../enums/index.js';
import { Messages } from '../../../exceptions/text/messages.js';
import { getPriceId } from './get-price-id.js';
import { getStripe } from './get-stripe.js';

export async function upgradeUserSubscription(
  subscriptionLevel: SubscriptionLevelEnum,
  userStripeId: string,
): Promise<ISubscriptionUpgradeResult> {
  try {
    const stripe = getStripe();
    const userSubscriptions = await stripe.subscriptions.list({ customer: userStripeId });
    const userSubscriptionPriceId = userSubscriptions?.data[0]?.items?.data[0]?.price?.id;

    const userSubscriptionId = userSubscriptions?.data[0]?.id;

    if (subscriptionLevel === SubscriptionLevelEnum.FREE_PLAN) {
      await stripe.subscriptions.del(userSubscriptionId);
      return {
        success: true,
        message: Messages.SUBSCRIPTION_CANCELLED,
      };
    }

    const priceIdForNewSubscription = getPriceId(subscriptionLevel);
    if (userSubscriptionPriceId && userSubscriptionId) {
      if (userSubscriptionPriceId === priceIdForNewSubscription) {
        throw new HttpException(
          {
            message: Messages.ALREADY_SUBSCRIBED_AT_THIS_LEVEL,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      await stripe.subscriptions.del(userSubscriptionId);
      await stripe.subscriptions.create({
        customer: userStripeId,
        items: [{ price: priceIdForNewSubscription }],
        trial_period_days: 30,
      });
      return {
        success: true,
        message: Messages.SUBSCRIPTION_SUCCESSFULLY_CREATED,
      };
    }
    await stripe.subscriptions.create({
      customer: userStripeId,
      items: [{ price: priceIdForNewSubscription }],
      trial_period_days: 30,
    });
    return {
      success: true,
      message: Messages.SUBSCRIPTION_SUCCESSFULLY_CREATED,
    };
  } catch (e) {
    throw new HttpException(
      {
        message: e.message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export interface ISubscriptionUpgradeResult {
  success: boolean;
  message: string;
}
