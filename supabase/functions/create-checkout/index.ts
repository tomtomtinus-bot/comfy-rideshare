import { type StripeEnv, createStripeClient, resolveOrCreateCustomer } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Coupon-config per priceId voor terugkerende kortingen op nieuwe abonnementen.
// Wordt idempotent in Stripe aangemaakt op basis van id.
const SUBSCRIPTION_COUPONS: Record<string, {
  id: string;
  percent_off: number;
  duration: "repeating";
  duration_in_months: number;
  name: string;
}> = {
  opdrachtgever_monthly: {
    id: "opdrachtgever_first_year_50",
    percent_off: 50,
    duration: "repeating",
    duration_in_months: 12,
    name: "Eerstejaars korting 50%",
  },
};

async function ensureCoupon(stripe: any, cfg: typeof SUBSCRIPTION_COUPONS[string]) {
  try {
    return await stripe.coupons.retrieve(cfg.id);
  } catch (_) {
    return await stripe.coupons.create({
      id: cfg.id,
      percent_off: cfg.percent_off,
      duration: cfg.duration,
      duration_in_months: cfg.duration_in_months,
      name: cfg.name,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { priceId, quantity, customerEmail, userId, returnUrl, environment } = body as {
      priceId: string;
      quantity?: number;
      customerEmail?: string;
      userId?: string;
      returnUrl: string;
      environment: StripeEnv;
    };

    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) throw new Error("Invalid priceId");
    if (!returnUrl) throw new Error("Missing returnUrl");
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");

    const stripe = createStripeClient(environment);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const customerId = (customerEmail || userId)
      ? await resolveOrCreateCustomer(stripe, { email: customerEmail, userId })
      : undefined;

    const SUBSCRIPTION_TRIALS: Record<string, number> = {
      opdrachtgever_monthly: 30,
      begeleider_monthly: 30,
    };
    const trialDays = isRecurring ? SUBSCRIPTION_TRIALS[priceId] : undefined;

    const couponCfg = isRecurring ? SUBSCRIPTION_COUPONS[priceId] : undefined;
    if (couponCfg) await ensureCoupon(stripe, couponCfg);

    const subscriptionData = isRecurring
      ? {
          ...(trialDays && { trial_period_days: trialDays }),
          ...(couponCfg && { discounts: [{ coupon: couponCfg.id }] }),
          ...(userId && { metadata: { userId } }),
        }
      : undefined;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      payment_method_types: ["card", "ideal"],
      ...(customerId && { customer: customerId }),
      ...(subscriptionData && Object.keys(subscriptionData).length > 0 && {
        subscription_data: subscriptionData,
      }),
      ...(userId && { metadata: { userId } }),
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
