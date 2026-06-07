import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolveOrCreateCustomer } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Auth-guard: alleen ingelogde gebruikers mogen een checkout starten.
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { priceId, quantity, customerEmail, returnUrl, environment } = body as {
      priceId: string;
      quantity?: number;
      customerEmail?: string;
      returnUrl: string;
      environment: StripeEnv;
    };
    // userId komt altijd uit het JWT, nooit uit de body.
    const userId = user.id;
    const safeEmail = customerEmail ?? user.email ?? undefined;

    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) throw new Error("Invalid priceId");
    if (!returnUrl) throw new Error("Missing returnUrl");
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");

    const stripe = createStripeClient(environment);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    // Bedrijfsabonnement: planner-basis (€10) + per-seat (€1,50 × N) op één factuur.
    const extraLineItems: Array<{ price: string; quantity: number }> = [];
    if (priceId === "begeleider_company_seat_v2_monthly") {
      const baseLookup = await stripe.prices.list({ lookup_keys: ["begeleider_company_base_monthly"] });
      if (!baseLookup.data.length) throw new Error("Base price not found");
      extraLineItems.push({ price: baseLookup.data[0].id, quantity: 1 });
    }

    const customerId = await resolveOrCreateCustomer(stripe, { email: safeEmail, userId });

    // Alleen begeleider-abonnementen krijgen 30 dagen proefperiode.
    // Opdrachtgevers worden via platform-facturen achteraf afgerekend.
    const SUBSCRIPTION_TRIALS: Record<string, number> = {
      begeleider_monthly: 30,
    };
    const trialDays = isRecurring ? SUBSCRIPTION_TRIALS[priceId] : undefined;

    const subscriptionData = isRecurring
      ? {
          ...(trialDays && { trial_period_days: trialDays }),
          metadata: { userId },
        }
      : undefined;

    const session = await stripe.checkout.sessions.create({
      line_items: [
        { price: stripePrice.id, quantity: quantity || 1 },
        ...extraLineItems,
      ],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      payment_method_types: ["card", "ideal"],
      customer: customerId,
      ...(subscriptionData && { subscription_data: subscriptionData }),
      metadata: { userId },
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
