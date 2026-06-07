import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const body = await req.json().catch(() => ({}));
    const { userId, email, fullName, phone, role, companyName } = body ?? {};
    if (!userId || !email) {
      return new Response(JSON.stringify({ error: "userId en email vereist" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verzamel admin user_ids
    const { data: roleRows, error: roleErr } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (roleErr) throw roleErr;

    const adminIds = (roleRows ?? []).map((r: any) => r.user_id);
    if (adminIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, info: "geen admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Haal admin e-mailadressen op via auth.admin.listUsers (gepagineerd).
    const adminEmails: string[] = [];
    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      for (const u of data.users) {
        if (u.email && adminIds.includes(u.id)) adminEmails.push(u.email);
      }
      if (data.users.length < 200) break;
      page++;
      if (page > 20) break;
    }

    const origin = req.headers.get("origin") ?? "https://viacust.com";
    const adminUrl = `${origin}/admin/users`;

    let sent = 0;
    const errors: string[] = [];
    const url = `${SUPABASE_URL}/functions/v1/send-transactional-email`;
    for (const recipient of adminEmails) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE}`,
            "apikey": SERVICE,
          },
          body: JSON.stringify({
            templateName: "new-signup-admin",
            recipientEmail: recipient,
            idempotencyKey: `new-signup-${userId}-${recipient}`,
            templateData: {
              fullName: fullName ?? "",
              email,
              phone: phone ?? "",
              role: role ?? "",
              companyName: companyName ?? "",
              adminUrl,
            },
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          errors.push(`${recipient}: ${res.status} ${txt}`);
        } else {
          sent++;
        }
      } catch (e) {
        errors.push(`${recipient}: ${String(e)}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
