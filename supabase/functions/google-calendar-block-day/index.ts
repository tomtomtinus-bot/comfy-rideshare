import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ensureFreshToken } from "../_shared/google.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const date = String(body.date ?? "");
    const title = String(body.title ?? "[ViaCust] Bezet/Verlof");
    const slots: string[] = Array.isArray(body.slots) ? body.slots : [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: "Invalid date (YYYY-MM-DD)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Map of slot id -> [startTime, endTime] in local Europe/Amsterdam time
    const SLOT_MAP: Record<string, [string, string]> = {
      night:     ["00:00", "06:00"],
      morning:   ["06:00", "12:00"],
      afternoon: ["12:00", "18:00"],
      evening:   ["18:00", "23:59"],
    };
    const SLOT_LABELS: Record<string, string> = {
      night:     "Nacht",
      morning:   "Ochtend",
      afternoon: "Middag",
      evening:   "Avond",
    };
    const chosen = slots.filter((s) => s in SLOT_MAP);
    if (chosen.length === 0) {
      return new Response(JSON.stringify({ error: "Geen tijdvak gekozen" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokenRow } = await admin
      .from("google_calendar_tokens")
      .select("*")
      .eq("escort_id", user.id)
      .maybeSingle();

    if (!tokenRow) {
      return new Response(JSON.stringify({ error: "Niet gekoppeld" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accessToken = await ensureFreshToken(admin, tokenRow);
    const calendarId = encodeURIComponent(tokenRow.calendar_id ?? "primary");

    const created: string[] = [];
    const errors: string[] = [];

    for (const slot of chosen) {
      const [startT, endT] = SLOT_MAP[slot];
      const eventBody = {
        summary: `${title} (${SLOT_LABELS[slot]})`,
        description: "Aangemaakt vanuit ViaCust planner.",
        start: { dateTime: `${date}T${startT}:00`, timeZone: "Europe/Amsterdam" },
        end:   { dateTime: `${date}T${endT}:00`,   timeZone: "Europe/Amsterdam" },
        transparency: "opaque",
      };

      const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(eventBody),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("Block slot failed", slot, resp.status, txt);
        errors.push(`${slot}: ${txt}`);
      } else {
        const j = await resp.json();
        if (j.id) created.push(j.id);
      }
    }

    if (created.length === 0) {
      return new Response(JSON.stringify({ error: "Google Agenda weigerde de blokkade", detail: errors.join("; ") }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, event_ids: created, failed: errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Block day error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

