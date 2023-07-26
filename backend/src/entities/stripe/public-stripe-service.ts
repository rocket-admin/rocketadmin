/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { SubscriptionLevelEnum } from '../../enums/subscription-level.enum.js';
import { Messages } from '../../exceptions/text/messages.js';
import { UserEntity } from '../user/user.entity.js';
import { StripeWebhookDS } from './application/data-structures/stripe-webhook.ds.js';
import { IStripeService, ISubscriptionUpgradeResult } from './application/interfaces/stripe-service.interface.js';

@Injectable()
export class PublicStripeService implements IStripeService {
  public processStripeWebhook(inputData: StripeWebhookDS): any {
    return null;
  }
  public async createStripeUsageRecord(
    ownerSubscriptionLevel: SubscriptionLevelEnum,
    numberOfUsers: number,
    ownerStripeCustomerId: string,
  ): Promise<void> {
    return;
  }

  public async getCurrentUserSubscription(userStripeId: string): Promise<any> {
    return;
  }
  public async upgradeUserSubscription(subscriptionLevel: SubscriptionLevelEnum, userStripeId: string): Promise<any> {
    return null;
  }
  public async createPortalLink(user: UserEntity): Promise<string> {
    return null;
  }

  public async createStripeSetupIntent(userStripeId: string): Promise<any> {
    return null;
  }

  public async attachStripeSetupIntentToCustomer(
    userStripeId: string,
    defaultPaymentMethodId: string,
    subscriptionLevel: SubscriptionLevelEnum,
  ): Promise<ISubscriptionUpgradeResult> {
    return null;
  }
}
