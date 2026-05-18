import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeoResult {
  query: string;
  lat: number | null;
  lng: number | null;
  formatted?: string;
  status: string;
}

async function geocodeOne(apiKey: string, query: string, region: string): Promise<GeoResult> {
  if (!query || !query.trim()) return { query, lat: null, lng: null, status: "EMPTY" };
  const u = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  u.searchParams.set("address", query);
  u.searchParams.set("language", "nl");
  u.searchParams.set("region", region);
  u.searchParams.set("key", apiKey);
  try {
    const r = await fetch(u);
    const j = await r.json();
    const top = j.results?.[0];
    if (!top) return { query, lat: null, lng: null, status: j.status || "ZERO_RESULTS" };
    return {
      query,
      lat: top.geometry?.location?.lat ?? null,
      lng: top.geometry?.location?.lng ?? null,
      formatted: top.formatted_address,
      status: j.status,
    };
  } catch (e) {
    return { query, lat: null, lng: null, status: `ERROR:${String(e)}` };
  }
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

    // Reverse-geocoding mode: { lat, lng } -> { formatted_address }
    if (typeof body?.lat === "number" && typeof body?.lng === "number") {
      const u = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      u.searchParams.set("latlng", `${body.lat},${body.lng}`);
      u.searchParams.set("language", "nl");
      u.searchParams.set("key", apiKey);
      try {
        const r = await fetch(u);
        const j = await r.json();
        const top = j.results?.[0];
        return new Response(JSON.stringify({
          formatted_address: top?.formatted_address ?? null,
          status: j.status,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const queries: string[] = Array.isArray(body.queries) ? body.queries : [];
    const region: string = (body.region || "nl").toLowerCase();

    // Beperk om misbruik te voorkomen
    const MAX = 250;
    const slice = queries.slice(0, MAX);

    // Batch met concurrency 5
    const results: GeoResult[] = new Array(slice.length);
    let i = 0;
    const workers: Promise<void>[] = [];
    const N = 5;
    for (let w = 0; w < N; w++) {
      workers.push((async () => {
        while (true) {
          const idx = i++;
          if (idx >= slice.length) return;
          results[idx] = await geocodeOne(apiKey, slice[idx], region);
        }
      })());
    }
    await Promise.all(workers);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
