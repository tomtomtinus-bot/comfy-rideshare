import { loadStripe, type Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const environment: StripeEnv = clientToken?.startsWith("pk_live_") ? "live" : "sandbox";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) {
      console.error("Payment client token is not configured");
      stripePromise = Promise.resolve(null);
      return stripePromise;
    }
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function hasStripeClientToken(): boolean {
  return Boolean(clientToken);
}

export function getStripeEnvironment(): StripeEnv {
  return environment;
}
