import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ensureFreshToken } from "../_shared/google.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BusyWindow { start: string; end: string }

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
      return new Response(JSON.stringify({ connected: false, busy: [] satisfies BusyWindow[] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await ensureFreshToken(admin, tokenRow);
    const calendarId = encodeURIComponent(tokenRow.calendar_id ?? "primary");
    const gHeaders = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // ---- PUSH: upcoming accepted assignments ----
    const fromIso = new Date().toISOString();
    const toIso = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    const { data: assigns } = await admin
      .from("ride_assignments")
      .select("id, status, estimated_hours, actual_hours, google_event_id, ride:rides!inner(id, scheduled_at, pickup_city, pickup_address, dropoff_city, dropoff_address, status, notes)")
      .eq("escort_id", user.id)
      .gte("ride.scheduled_at", fromIso)
      .lte("ride.scheduled_at", toIso);

    let pushed = 0, removed = 0;
    for (const a of assigns ?? []) {
      const ride = (a as any).ride;
      const shouldHaveEvent = a.status === "accepted" && ride && ride.status !== "cancelled";
      if (shouldHaveEvent) {
        const start = new Date(ride.scheduled_at);
        const hours = Number(a.actual_hours ?? a.estimated_hours ?? 3);
        const end = new Date(start.getTime() + hours * 3600 * 1000);
        const body = {
          summary: `Begeleiding ${ride.pickup_city} → ${ride.dropoff_city}`,
          location: ride.pickup_address ?? ride.pickup_city,
          description: `Rit ${ride.id}\n${ride.notes ?? ""}`.trim(),
          start: { dateTime: start.toISOString(), timeZone: "Europe/Amsterdam" },
          end: { dateTime: end.toISOString(), timeZone: "Europe/Amsterdam" },
          source: { title: "Konvooi Planner", url: `${Deno.env.get("SUPABASE_URL")}` },
        };
        let eventId = a.google_event_id as string | null;
        let resp: Response;
        if (eventId) {
          resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`, {
            method: "PATCH", headers: gHeaders, body: JSON.stringify(body),
          });
          if (resp.status === 404) {
            // recreate
            resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
              method: "POST", headers: gHeaders, body: JSON.stringify(body),
            });
            const j = await resp.json();
            if (resp.ok) {
              await admin.from("ride_assignments").update({ google_event_id: j.id }).eq("id", a.id);
              pushed++;
            }
            continue;
          }
        } else {
          resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
            method: "POST", headers: gHeaders, body: JSON.stringify(body),
          });
        }
        if (resp.ok) {
          const j = await resp.json();
          if (j.id && j.id !== eventId) {
            await admin.from("ride_assignments").update({ google_event_id: j.id }).eq("id", a.id);
          }
          pushed++;
        } else {
          console.error("Push event failed", a.id, resp.status, await resp.text());
        }
      } else if (a.google_event_id) {
        // remove orphaned event
        const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(a.google_event_id)}`, {
          method: "DELETE", headers: gHeaders,
        });
        if (resp.ok || resp.status === 404 || resp.status === 410) {
          await admin.from("ride_assignments").update({ google_event_id: null }).eq("id", a.id);
          removed++;
        }
      }
    }

    // ---- PULL: free/busy windows for next 7 days ----
    const fbFrom = new Date();
    fbFrom.setHours(0, 0, 0, 0);
    const fbTo = new Date(fbFrom.getTime() + 7 * 24 * 3600 * 1000);
    const fbResp = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST", headers: gHeaders,
      body: JSON.stringify({
        timeMin: fbFrom.toISOString(),
        timeMax: fbTo.toISOString(),
        timeZone: "Europe/Amsterdam",
        items: [{ id: tokenRow.calendar_id ?? "primary" }],
      }),
    });
    const busy: BusyWindow[] = [];
    if (fbResp.ok) {
      const fbJson = await fbResp.json();
      const cals = fbJson.calendars ?? {};
      for (const k of Object.keys(cals)) {
        for (const b of (cals[k].busy ?? [])) busy.push({ start: b.start, end: b.end });
      }
    } else {
      console.error("FreeBusy failed", await fbResp.text());
    }

    const nowIso = new Date().toISOString();
    await admin.from("google_calendar_tokens").update({ last_sync_at: nowIso }).eq("escort_id", user.id);

    // Fetch connected Google account email
    let accountEmail: string | null = null;
    try {
      const uiResp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
      if (uiResp.ok) {
        const ui = await uiResp.json();
        accountEmail = ui.email ?? null;
      }
    } catch (_) { /* ignore */ }

    // Return upcoming accepted assignments (7d) so UI can link busy days to rides
    const next7 = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const { data: upcoming } = await admin
      .from("ride_assignments")
      .select("id, status, estimated_hours, actual_hours, ride:rides!inner(id, scheduled_at, pickup_city, dropoff_city, status)")
      .eq("escort_id", user.id)
      .eq("status", "accepted")
      .gte("ride.scheduled_at", new Date().toISOString())
      .lte("ride.scheduled_at", next7);

    const assignments = (upcoming ?? []).map((a: any) => ({
      id: a.id,
      ride_id: a.ride?.id,
      scheduled_at: a.ride?.scheduled_at,
      hours: Number(a.actual_hours ?? a.estimated_hours ?? 3),
      pickup_city: a.ride?.pickup_city,
      dropoff_city: a.ride?.dropoff_city,
    }));

    return new Response(JSON.stringify({
      connected: true,
      pushed,
      removed,
      busy,
      assignments,
      account_email: accountEmail,
      last_sync_at: nowIso,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Sync error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
