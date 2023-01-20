import { StripeWebhookDS } from '../application/data-structures/stripe-webhook.ds.js';

export interface IStripeWebhook {
  execute(inputData: StripeWebhookDS): Promise<void>;
}
