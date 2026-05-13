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
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const { invoiceId, returnUrl, environment } = await req.json() as {
      invoiceId: string;
      returnUrl: string;
      environment: StripeEnv;
    };
    if (!invoiceId) throw new Error("Missing invoiceId");
    if (environment !== "sandbox" && environment !== "live") throw new Error("Invalid environment");

    const { data: inv, error } = await supabase
      .from("platform_invoices")
      .select("id, invoice_number, total_amount, client_id, status")
      .eq("id", invoiceId)
      .maybeSingle();
    if (error || !inv) throw new Error("Invoice not found");
    if (inv.client_id !== user.id) throw new Error("Forbidden");
    if (inv.status === "paid") throw new Error("Reeds betaald");

    const amountCents = Math.round(Number(inv.total_amount) * 100);
    if (amountCents < 50) throw new Error("Bedrag te laag");

    const stripe = createStripeClient(environment);
    const customerId = await resolveOrCreateCustomer(stripe, {
      email: user.email,
      userId: user.id,
    });

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: { name: `Platformfactuur ${inv.invoice_number}` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      ui_mode: "embedded",
      return_url: returnUrl,
      payment_method_types: ["card", "ideal"],
      customer: customerId,
      metadata: {
        userId: user.id,
        platform_invoice_id: inv.id,
        invoice_number: inv.invoice_number,
      },
    });

    await supabase
      .from("platform_invoices")
      .update({ stripe_session_id: session.id })
      .eq("id", inv.id);

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-platform-invoice-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
