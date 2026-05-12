import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function fmtPoint(p: any): string {
  if (!p) return "";
  if (typeof p === "string") return p;
  if (typeof p === "object" && "lat" in p && "lng" in p) return `${p.lat},${p.lng}`;
  return String(p);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = (Deno.env.get("GOOGLE_MAPS_SERVER_KEY") ?? Deno.env.get("GOOGLE_MAPS_API_KEY"))!;
    const body = await req.json();
    const origin = fmtPoint(body.origin);
    const destination = fmtPoint(body.destination);
    if (!origin || !destination) {
      return new Response(JSON.stringify({ error: "origin and destination required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const u = new URL("https://maps.googleapis.com/maps/api/directions/json");
    u.searchParams.set("origin", origin);
    u.searchParams.set("destination", destination);
    u.searchParams.set("language", "nl");
    u.searchParams.set("region", "nl");
    if (Array.isArray(body.waypoints) && body.waypoints.length) {
      u.searchParams.set("waypoints", body.waypoints.map(fmtPoint).join("|"));
    }
    u.searchParams.set("key", apiKey);
    const r = await fetch(u);
    const j = await r.json();

    const route = j.routes?.[0];
    if (!route) {
      return new Response(JSON.stringify({ error: "no route", status: j.status }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const leg = route.legs?.[0];
    return new Response(JSON.stringify({
      polyline: route.overview_polyline?.points,
      bounds: route.bounds,
      distance_m: leg?.distance?.value ?? 0,
      distance_text: leg?.distance?.text ?? "",
      duration_s: leg?.duration?.value ?? 0,
      duration_text: leg?.duration?.text ?? "",
      start: leg?.start_location,
      end: leg?.end_location,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
