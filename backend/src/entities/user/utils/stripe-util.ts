import Stripe from 'stripe';
import { UserEntity } from '../user.entity.js';
import { isSaaS } from '../../../helpers/app/is-saas.js';
import { Messages } from '../../../exceptions/text/messages.js';

export class StripeUtil {
  public static async createPortalLink(user: UserEntity): Promise<string> {
    if (!isSaaS()) {
      return Messages.NO_STRIPE;
    }
    if (!user.stripeId) {
      return null;
    }
    const stripe = this.getStripe();
    const session: Stripe.BillingPortal.Session = await stripe.billingPortal.sessions.create({
      customer: user.stripeId,
      return_url: 'https://autoadmin.org',
    });
    return session.url;
  }

  private static getStripe(): Stripe {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    return new Stripe(stripeKey, {
      apiVersion: '2022-11-15',
    });
  }
}
