// Probeert een platform-factuur automatisch af te schrijven van de
// opgeslagen Stripe-betaalmethode van de opdrachtgever (off-session).
// Bij succes wordt de factuur op 'paid' gezet. Bij mislukking blijft
// de factuur 'open' staan, krijgt de klant een mail én een banner-melding.
//
// Auth: alleen toegankelijk voor admins (ingelogd) of voor cron-aanroepen
// met de service-role key in de Authorization-header.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);

function defaultEnv(): StripeEnv {
  // Standaard sandbox; live moet expliciet aangevraagd worden via body.environment.
  return "sandbox";
}

async function isAuthorized(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (!auth) return false;
  // Cron / interne aanroep met service-role key.
  if (auth === SERVICE_KEY) return true;
  // Admin user check
  const { data: { user } } = await supabase.auth.getUser(auth);
  if (!user) return false;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  return (roles ?? []).some((r: any) => r.role === "admin");
}

async function sendFailureEmail(invoice: any) {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, billing_email")
      .eq("id", invoice.client_id)
      .maybeSingle();
    const { data: authUser } = await supabase.auth.admin.getUserById(invoice.client_id);
    const email = profile?.billing_email || authUser?.user?.email;
    if (!email) return;
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "payment-failed-client",
        recipientEmail: email,
        idempotencyKey: `pi-failed-${invoice.id}-${invoice.last_charge_failed_at ?? Date.now()}`,
        templateData: {
          name: profile?.full_name ?? "",
          invoiceNumber: invoice.invoice_number,
          amount: Number(invoice.total_amount).toLocaleString("nl-NL", { style: "currency", currency: "EUR" }),
        },
      },
    });
  } catch (e) {
    console.error("send failure email error:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const invoiceId = String(body?.invoice_id ?? body?.invoiceId ?? "");
    if (!invoiceId) throw new Error("invoice_id required");

    const env: StripeEnv = body?.environment === "sandbox" || body?.environment === "live"
      ? body.environment
      : defaultEnv();

    // Atomisch 'claimen' van de factuur door stripe_payment_intent_id van NULL
    // naar 'pending:<random>' te zetten. Een tweede gelijktijdige aanroep
    // krijgt 0 rows terug en stopt.
    const claimToken = `pending:${crypto.randomUUID()}`;
    const { data: claimed, error: claimErr } = await supabase
      .from("platform_invoices")
      .update({ stripe_payment_intent_id: claimToken })
      .eq("id", invoiceId)
      .is("stripe_payment_intent_id", null)
      .eq("status", "open")
      .select("id, invoice_number, total_amount, client_id")
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (!claimed) {
      // Geen rij — al betaald of al een poging gedaan.
      const { data: existing } = await supabase
        .from("platform_invoices")
        .select("status, stripe_payment_intent_id")
        .eq("id", invoiceId)
        .maybeSingle();
      return new Response(JSON.stringify({
        status: existing?.status === "paid" ? "already_paid" : "already_attempted",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const amountCents = Math.round(Number(claimed.total_amount) * 100);
    if (amountCents < 50) throw new Error("Bedrag te laag");

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", claimed.client_id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      await supabase.from("platform_invoices")
        .update({ stripe_payment_intent_id: null })
        .eq("id", invoiceId);
      return new Response(JSON.stringify({ status: "no_customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(env);

    const customer = await stripe.customers.retrieve(sub.stripe_customer_id) as any;
    let pmId: string | undefined =
      customer?.invoice_settings?.default_payment_method ||
      customer?.default_source || undefined;
    if (!pmId) {
      const pms = await stripe.paymentMethods.list({ customer: sub.stripe_customer_id, limit: 1 });
      pmId = pms.data[0]?.id;
    }
    if (!pmId) {
      await supabase.from("platform_invoices")
        .update({ stripe_payment_intent_id: null })
        .eq("id", invoiceId);
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
        description: `Platformfactuur ${claimed.invoice_number}`,
        metadata: {
          platform_invoice_id: claimed.id,
          invoice_number: claimed.invoice_number,
          userId: claimed.client_id,
        },
      });
    } catch (e: any) {
      const piId = e?.payment_intent?.id ?? null;
      const msg = e?.message ?? "charge failed";
      console.error(`Auto-charge failed for ${claimed.invoice_number}:`, msg);
      const now = new Date().toISOString();
      await supabase.from("platform_invoices").update({
        stripe_payment_intent_id: piId,
        last_charge_failed_at: now,
        last_charge_error: msg,
      }).eq("id", invoiceId);
      await sendFailureEmail({ ...claimed, last_charge_failed_at: now });
      return new Response(JSON.stringify({ status: "failed", error: msg }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: Record<string, unknown> = { stripe_payment_intent_id: intent.id };
    if (intent.status === "succeeded") {
      update.status = "paid";
      update.paid_at = new Date().toISOString();
      update.last_charge_failed_at = null;
      update.last_charge_error = null;
    }
    await supabase.from("platform_invoices").update(update).eq("id", invoiceId);

    return new Response(JSON.stringify({ status: intent.status, intent_id: intent.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("charge-platform-invoice error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
