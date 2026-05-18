import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }
  const items = subscription.items?.data ?? [];
  // Kies "primair" item: seat-item bij bedrijfsabo, anders eerste item.
  const SEAT_PRICE_IDS = ["begeleider_company_seat_v2_monthly", "begeleider_company_seat_monthly"];
  const seatItem = items.find((it: any) => {
    const id = it?.price?.lookup_key || it?.price?.metadata?.lovable_external_id || it?.price?.id;
    return SEAT_PRICE_IDS.includes(id);
  });
  const item = seatItem ?? items[0];
  const priceId = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  // Bepaal het einde van een terugkerende korting (bijv. eerstejaars 50% korting).
  // Stripe geeft kortingen via subscription.discounts (nieuwe API) of subscription.discount (oud).
  let discountEndsAt: string | null = null;
  const discounts = subscription.discounts ?? (subscription.discount ? [subscription.discount] : []);
  for (const d of discounts) {
    const coupon = d?.coupon;
    if (coupon?.duration === "repeating" && coupon?.duration_in_months) {
      const startSec = d.start ?? subscription.start_date ?? subscription.created;
      if (startSec) {
        const start = new Date(startSec * 1000);
        const end = new Date(start);
        end.setMonth(end.getMonth() + coupon.duration_in_months);
        discountEndsAt = end.toISOString();
        break;
      }
    }
  }

  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      discount_ends_at: discountEndsAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  // Sync seat_limit op het bedrijf voor het per-seat bedrijfsabonnement.
  if (SEAT_PRICE_IDS.includes(priceId)) {
    const quantity = Number(seatItem?.quantity ?? item?.quantity ?? 1);
    const activeStatuses = ["active", "trialing", "past_due"];
    const isActive = activeStatuses.includes(subscription.status)
      || (subscription.status === "canceled" && periodEnd && periodEnd * 1000 > Date.now());
    // seat_limit = planner (1) + ingekochte chauffeur-seats
    const newLimit = isActive ? 1 + Math.max(0, quantity) : 1;
    await getSupabase()
      .from("companies")
      .update({ seat_limit: newLimit, updated_at: new Date().toISOString() })
      .eq("owner_id", userId);
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  // Reset seat_limit voor opgezegd per-seat abonnement.
  const userId = subscription.metadata?.userId;
  const SEAT_PRICE_IDS = ["begeleider_company_seat_v2_monthly", "begeleider_company_seat_monthly"];
  const hasSeat = (subscription.items?.data ?? []).some((it: any) => {
    const id = it?.price?.lookup_key || it?.price?.metadata?.lovable_external_id || it?.price?.id;
    return SEAT_PRICE_IDS.includes(id);
  });
  if (userId && hasSeat) {
    await getSupabase()
      .from("companies")
      .update({ seat_limit: 1, updated_at: new Date().toISOString() })
      .eq("owner_id", userId);
  }
}

async function handleCheckoutCompleted(session: any) {
  const invoiceId = session.metadata?.platform_invoice_id;
  if (!invoiceId) return;
  if (session.payment_status !== "paid") return;
  await getSupabase()
    .from("platform_invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: session.payment_intent,
    })
    .eq("id", invoiceId);
}

async function handlePaymentIntentSucceeded(intent: any) {
  const invoiceId = intent.metadata?.platform_invoice_id;
  if (!invoiceId) return;
  await getSupabase()
    .from("platform_invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: intent.id,
    })
    .eq("id", invoiceId)
    .neq("status", "paid");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
