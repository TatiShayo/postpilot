import Stripe from "stripe";

let client: Stripe | null = null;

function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return client;
}

/**
 * Lazy Stripe proxy. Constructing at module scope throws when STRIPE_SECRET_KEY
 * is absent (build-time page-data collection, tests), so defer construction to
 * first property access while keeping the ergonomic `import { stripe }` API.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});
