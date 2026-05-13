import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Venster: kortingen die over 29-31 dagen aflopen, waarvoor nog geen herinnering verstuurd is.
  const now = new Date();
  const lower = new Date(now.getTime() + 29 * 86400_000).toISOString();
  const upper = new Date(now.getTime() + 31 * 86400_000).toISOString();

  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, discount_ends_at, status")
    .gte("discount_ends_at", lower)
    .lte("discount_ends_at", upper)
    .is("discount_reminder_sent_at", null)
    .in("status", ["active", "trialing", "past_due"]);

  if (error) {
    console.error("query error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  for (const sub of subs ?? []) {
    try {
      // Haal e-mail + naam op via auth.users
      const { data: userResp } = await supabase.auth.admin.getUserById(sub.user_id as string);
      const email = userResp?.user?.email;
      if (!email) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", sub.user_id as string)
        .maybeSingle();
      const name = (profile as any)?.full_name as string | undefined;

      const endsAtDate = new Date(sub.discount_ends_at as string);
      const endsAt = endsAtDate.toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const { error: invokeErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "discount-ending",
          recipientEmail: email,
          idempotencyKey: `discount-ending-${sub.id}`,
          templateData: {
            name,
            endsAt,
            fullPrice: "€50,00",
            discountedPrice: "€25,00",
          },
        },
      });
      if (invokeErr) {
        console.error("send error for sub", sub.id, invokeErr);
        continue;
      }

      await supabase
        .from("subscriptions")
        .update({ discount_reminder_sent_at: new Date().toISOString() })
        .eq("id", sub.id as string);

      sent++;
    } catch (e) {
      console.error("loop error", e);
    }
  }

  return new Response(JSON.stringify({ ok: true, checked: subs?.length ?? 0, sent }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
