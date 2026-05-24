// Wekelijkse gezondheidscheck (maandag):
// - Zijn er deze maandag platform-facturen aangemaakt?
// - Zijn de brandstofprijzen voor deze week opgehaald (NL/BE/FR)?
// Bij problemen: notificatie + email naar elke admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isoMonday(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const monday = isoMonday();
    const issues: string[] = [];

    // 1. Platform-facturen vandaag
    const startOfDay = new Date(`${monday}T00:00:00Z`).toISOString();
    const endOfDay = new Date(`${monday}T23:59:59Z`).toISOString();
    const { count: invoiceCount, error: invErr } = await admin
      .from("platform_invoices")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);
    if (invErr) throw invErr;
    if ((invoiceCount ?? 0) === 0) {
      issues.push(`Geen platform-facturen aangemaakt op ${monday}.`);
    }

    // 2. Brandstofprijzen deze week per land
    const { data: fuelRows, error: fuelErr } = await admin
      .from("weekly_fuel_prices")
      .select("country")
      .eq("week_start", monday);
    if (fuelErr) throw fuelErr;
    const haveCountries = new Set((fuelRows ?? []).map((r: any) => r.country));
    for (const c of ["NL", "BE", "FR"] as const) {
      if (!haveCountries.has(c)) {
        issues.push(`Brandstofprijs ${c} ontbreekt voor week van ${monday}.`);
      }
    }

    if (issues.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, monday, issues: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admins ophalen
    const { data: roleRows, error: roleErr } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (roleErr) throw roleErr;
    const adminIds = (roleRows ?? []).map((r: any) => r.user_id);

    const title = "Wekelijkse controle: actie vereist";
    const body = issues.join("\n");

    // In-app notificaties (idempotent per maandag)
    if (adminIds.length > 0) {
      const rows = adminIds.map((uid: string) => ({
        user_id: uid,
        type: "admin_health_check",
        title,
        body,
      }));
      const { error: notifErr } = await admin.from("notifications").insert(rows);
      if (notifErr) console.error("notifications insert:", notifErr);
    }

    // Email naar admins
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

    let sent = 0;
    for (const recipient of adminEmails) {
      const { error: invErr } = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "payment-failed-admin",
          recipientEmail: recipient,
          idempotencyKey: `monday-health-${monday}-${recipient}`,
          templateData: {
            eventType: "Wekelijkse controle",
            errorMessage: body,
            adminUrl: "https://viacust.com/admin/invoices",
          },
        },
      });
      if (!invErr) sent++;
    }

    return new Response(
      JSON.stringify({ ok: true, monday, issues, notified: adminIds.length, emailed: sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("monday-health-check error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
