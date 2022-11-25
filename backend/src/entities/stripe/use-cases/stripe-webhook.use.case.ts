import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import AbstractUseCase from '../../../common/abstract-use.case';
import { IGlobalDatabaseContext } from '../../../common/application/global-database-context.intarface';
import { BaseType } from '../../../common/data-injection.tokens';
import { Messages } from '../../../exceptions/text/messages';
import { StripeWebhookDS } from '../application/data-structures/stripe-webhook.ds';
import { getStripe } from '../stripe-helpers/get-stripe';
import { IStripeWebhook } from './stripe-use-cases.interface';

@Injectable()
export class StripeWebhookUseCase extends AbstractUseCase<StripeWebhookDS, void> implements IStripeWebhook {
  constructor(
    @Inject(BaseType.GLOBAL_DB_CONTEXT)
    protected _dbContext: IGlobalDatabaseContext,
  ) {
    super();
  }

  protected async implementation(inputData: StripeWebhookDS): Promise<void> {
    const { request, stripeSigranture } = inputData;
    let event: Stripe.Event;
    try {
      const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;
      if (!endpointSecret) {
        throw new Error('Stripe enpoint secret missiong');
      }
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(request.rawBody, stripeSigranture, endpointSecret);
    } catch (error) {
      throw new HttpException(
        {
          message: `Webhook Error: ${error.message}`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    switch (event.type) {
      case 'checkout.session.completed':
        const userId = event.data.object['client_reference_id'];
        const stripeCustomerId = event.data.object['customer'];
        await this.setStripeCustomerIdToUser(userId, stripeCustomerId);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    return;
  }

  private async setStripeCustomerIdToUser(userId: string, stripeCustomerId: string): Promise<void> {
    const foundUser = await this._dbContext.userRepository.findOneUserById(userId);
    if (!foundUser) {
      throw new HttpException(
        {
          message: Messages.USER_NOT_FOUND,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    foundUser.stripeId = stripeCustomerId;
    await this._dbContext.userRepository.saveUserEntity(foundUser);
    return;
  }
}
