// Verwijdert een ontheffing (storage + DB) zodra alle ritten waar deze aan
// gekoppeld is door de begeleider zijn afgerond. Wordt aangeroepen door een
// DB-trigger via pg_net — geen JWT nodig, gebruikt service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const permitId: string | undefined = body.permit_id;
    if (!permitId) {
      return new Response(JSON.stringify({ error: "permit_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Veiligheidscheck: alleen verwijderen als alle gekoppelde ritten
    // afgerond zijn (alle accepted assignments hebben hours_submitted_at).
    const { data: rides } = await admin
      .from("rides")
      .select("id")
      .eq("permit_id", permitId);
    const rideIds = (rides ?? []).map((r) => r.id);

    if (rideIds.length > 0) {
      const { data: openAssignments } = await admin
        .from("ride_assignments")
        .select("id")
        .in("ride_id", rideIds)
        .eq("status", "accepted")
        .is("hours_submitted_at", null)
        .limit(1);

      if (openAssignments && openAssignments.length > 0) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "ride not finished yet" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Permit ophalen voor pdf_path
    const { data: permit } = await admin
      .from("permits")
      .select("id, pdf_path")
      .eq("id", permitId)
      .maybeSingle();
    if (!permit) {
      return new Response(JSON.stringify({ ok: true, alreadyGone: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (permit.pdf_path) {
      await admin.storage.from("permits").remove([permit.pdf_path]).catch(() => {});
    }
    await admin.from("permit_routes").delete().eq("permit_id", permitId);
    await admin.from("permits").delete().eq("id", permitId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
