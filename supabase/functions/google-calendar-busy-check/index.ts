import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ensureFreshToken } from "../_shared/google.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  escort_ids: string[];
  start: string; // ISO
  end: string;   // ISO
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!Array.isArray(body.escort_ids) || !body.start || !body.end) {
      return new Response(JSON.stringify({ error: "Bad request" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokens } = await admin
      .from("google_calendar_tokens")
      .select("*")
      .in("escort_id", body.escort_ids);

    const tokenByEscort = new Map<string, any>();
    for (const t of tokens ?? []) tokenByEscort.set(t.escort_id, t);

    // Escorts without a Google connection -> treated as busy (no_calendar)
    const noCalendar: string[] = body.escort_ids.filter((id) => !tokenByEscort.has(id));
    const busy: string[] = [];
    const errors: string[] = [];

    for (const id of body.escort_ids) {
      const tok = tokenByEscort.get(id);
      if (!tok) continue; // already in noCalendar
      try {
        const accessToken = await ensureFreshToken(admin, tok);
        const calId = tok.calendar_id ?? "primary";
        const resp = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            timeMin: body.start,
            timeMax: body.end,
            timeZone: "Europe/Amsterdam",
            items: [{ id: calId }],
          }),
        });
        if (!resp.ok) {
          errors.push(id);
          continue;
        }
        const j = await resp.json();
        const cals = j.calendars ?? {};
        let isBusy = false;
        for (const k of Object.keys(cals)) {
          if ((cals[k].busy ?? []).length > 0) { isBusy = true; break; }
        }
        if (isBusy) busy.push(id);
      } catch (e) {
        console.error("freebusy err", id, e);
        errors.push(id);
      }
    }

    return new Response(JSON.stringify({ busy, no_calendar: noCalendar, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
