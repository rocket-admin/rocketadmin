import Stripe from 'stripe';
import { StripeWebhookDS } from '../application/data-structures/stripe-webhook.ds';

export interface IStripeWebhook {
  execute(inputData: StripeWebhookDS): Promise<void>;
}
