// Soft delete van een account: zet deletion_requested_at + scheduled (30 dagen).
// Cancelt actieve Stripe-abonnementen direct.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient } from "../_shared/stripe.ts";

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
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const scheduled = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    await supabase.from("profiles").update({
      deletion_requested_at: now.toISOString(),
      deletion_scheduled_at: scheduled.toISOString(),
      updated_at: now.toISOString(),
    }).eq("id", user.id);

    // Cancel actieve Stripe-abonnementen (beide omgevingen) direct aan einde periode.
    for (const env of ["sandbox", "live"] as const) {
      try {
        const { data: subs } = await supabase
          .from("subscriptions")
          .select("stripe_subscription_id, status, environment")
          .eq("user_id", user.id)
          .eq("environment", env);
        if (!subs?.length) continue;
        const stripe = createStripeClient(env);
        for (const s of subs as any[]) {
          if (["active", "trialing", "past_due"].includes(s.status)) {
            try {
              await stripe.subscriptions.update(s.stripe_subscription_id, {
                cancel_at_period_end: true,
              });
            } catch (e) {
              console.error(`cancel sub ${s.stripe_subscription_id} failed:`, e);
            }
          }
        }
      } catch (e) {
        console.error(`stripe ${env} cleanup error:`, e);
      }
    }

    // Mail bevestiging
    try {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "account-deletion-scheduled",
          recipientEmail: user.email,
          idempotencyKey: `acct-del-${user.id}-${now.toISOString().slice(0, 10)}`,
          templateData: {
            scheduledAt: scheduled.toLocaleDateString("nl-NL", { dateStyle: "long" }),
          },
        },
      });
    } catch (e) { console.error("delete-account mail error:", e); }

    return new Response(JSON.stringify({ status: "scheduled", scheduled_at: scheduled.toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("delete-account error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
