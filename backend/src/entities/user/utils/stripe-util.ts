import Stripe from 'stripe';
import { UserEntity } from '../user.entity';

export class StripeUtil {
  public static async createPortalLink(user: UserEntity): Promise<string> {
    if (process.env.NODE_ENV === 'test') {
      return 'teststripelink';
    }
    const stripe = this.getStripe();
    const session: Stripe.BillingPortal.Session = await stripe.billingPortal.sessions.create({
      customer: user.stripeId,
      return_url: 'https://autoadmin.org',
    });
    return session.url;
  }

  public static async createUserStripeCustomerAndReturnStripeId(cognitoUserName): Promise<string> {
    if (process.env.NODE_ENV === 'test') {
      return 'teststripeid';
    }
    return await this.createStripeCustomer(cognitoUserName);
  }

  public static async createStripeCustomerAndGetIdByEmailAndId(userEmail: string, userId: string): Promise<string> {
    if (process.env.NODE_ENV === 'test') {
      return 'teststripeid';
    }
    return await this.createStripeCustomerWithEmailAndId(userEmail, userId);
  }

  private static getStripe(): Stripe {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    return new Stripe(stripeKey, {
      apiVersion: '2020-08-27',
    });
  }

  private static async createStripeCustomer(cognitoUserName): Promise<string> {
    const customerParams: Stripe.CustomerCreateParams = {
      name: cognitoUserName,
    };
    const stripe = this.getStripe();
    const customer: Stripe.Customer = await stripe.customers.create(customerParams);
    return customer.id;
  }

  private static async createStripeCustomerWithEmailAndId(email: string, userId: string): Promise<string> {
    const customerParams: Stripe.CustomerCreateParams = {
      name: userId,
      email: email ? email : undefined,
    };
    const stripe = this.getStripe();
    const customer: Stripe.Customer = await stripe.customers.create(customerParams);
    return customer.id;
  }
}
