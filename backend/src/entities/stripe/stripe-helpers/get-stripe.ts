import Stripe from 'stripe';

export function getStripe(): Stripe {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  return new Stripe(stripeKey, {
    apiVersion: '2022-11-15',
  });
}
