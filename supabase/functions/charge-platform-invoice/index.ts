// Probeert een platform-factuur automatisch af te schrijven van de
// opgeslagen Stripe-betaalmethode van de opdrachtgever (off-session).
// Bij succes wordt de factuur op 'paid' gezet. Bij mislukking blijft
// de factuur 'open' staan zodat de klant alsnog handmatig kan betalen.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function pickEnv(): StripeEnv {
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const invoiceId = String(body?.invoice_id ?? body?.invoiceId ?? "");
    if (!invoiceId) throw new Error("invoice_id required");

    const env: StripeEnv = body?.environment === "sandbox" || body?.environment === "live"
      ? body.environment
      : pickEnv();

    const { data: inv, error } = await supabase
      .from("platform_invoices")
      .select("id, invoice_number, total_amount, client_id, status, stripe_payment_intent_id")
      .eq("id", invoiceId)
      .maybeSingle();
    if (error || !inv) throw new Error("Invoice not found");
    if (inv.status === "paid") {
      return new Response(JSON.stringify({ status: "already_paid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inv.stripe_payment_intent_id) {
      return new Response(JSON.stringify({ status: "already_attempted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCents = Math.round(Number(inv.total_amount) * 100);
    if (amountCents < 50) throw new Error("Bedrag te laag");

    // Customer ophalen via lopend abonnement van de opdrachtgever.
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, status")
      .eq("user_id", inv.client_id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      console.log(`No Stripe customer for client ${inv.client_id}; skipping auto-charge`);
      return new Response(JSON.stringify({ status: "no_customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(env);

    // Default betaalmethode bepalen.
    const customer = await stripe.customers.retrieve(sub.stripe_customer_id) as any;
    let pmId: string | undefined =
      customer?.invoice_settings?.default_payment_method ||
      customer?.default_source ||
      undefined;

    if (!pmId) {
      const pms = await stripe.paymentMethods.list({
        customer: sub.stripe_customer_id,
        limit: 1,
      });
      pmId = pms.data[0]?.id;
    }

    if (!pmId) {
      console.log(`No saved payment method for customer ${sub.stripe_customer_id}`);
      return new Response(JSON.stringify({ status: "no_payment_method" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let intent: any;
    try {
      intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "eur",
        customer: sub.stripe_customer_id,
        payment_method: pmId,
        off_session: true,
        confirm: true,
        description: `Platformfactuur ${inv.invoice_number}`,
        metadata: {
          platform_invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          userId: inv.client_id,
        },
      });
    } catch (e: any) {
      const piId = e?.payment_intent?.id ?? null;
      console.error(`Auto-charge failed for ${inv.invoice_number}:`, e?.message);
      await supabase
        .from("platform_invoices")
        .update({ stripe_payment_intent_id: piId })
        .eq("id", inv.id);
      return new Response(
        JSON.stringify({ status: "failed", error: e?.message ?? "charge failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const update: Record<string, unknown> = {
      stripe_payment_intent_id: intent.id,
    };
    if (intent.status === "succeeded") {
      update.status = "paid";
      update.paid_at = new Date().toISOString();
    }
    await supabase.from("platform_invoices").update(update).eq("id", inv.id);

    return new Response(JSON.stringify({ status: intent.status, intent_id: intent.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("charge-platform-invoice error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
