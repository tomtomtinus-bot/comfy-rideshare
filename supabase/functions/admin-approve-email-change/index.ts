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
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: ures } = await userClient.auth.getUser();
    const caller = ures?.user;
    if (!caller) return new Response(JSON.stringify({ error: "Niet ingelogd" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Geen admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { requestId } = await req.json();
    if (!requestId) return new Response(JSON.stringify({ error: "requestId vereist" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: reqRow, error: reqErr } = await admin
      .from("email_change_requests")
      .select("id, user_id, new_email, status")
      .eq("id", requestId)
      .maybeSingle();
    if (reqErr || !reqRow) return new Response(JSON.stringify({ error: "Aanvraag niet gevonden" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (reqRow.status !== "pending") return new Response(JSON.stringify({ error: "Aanvraag al verwerkt" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Update user's email — Supabase stuurt automatisch een bevestigingsmail naar het nieuwe adres
    const { error: updErr } = await admin.auth.admin.updateUserById(reqRow.user_id, {
      email: reqRow.new_email,
      email_confirm: false,
    });
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("email_change_requests").update({
      status: "approved",
      decided_by: caller.id,
      decided_at: new Date().toISOString(),
    }).eq("id", requestId);

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
