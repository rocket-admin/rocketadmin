import { SubscriptionLevelEnum } from "../../../../enums/subscription-level.enum.js";

export class AddStripeSetupIntentDs {
  userId: string;
  defaultPaymentMethodId: string;
  subscriptionLevel: SubscriptionLevelEnum;
}