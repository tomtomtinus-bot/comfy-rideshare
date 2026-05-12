import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY")!;
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "autocomplete";

    if (action === "autocomplete") {
      const input = String(body.input ?? "").trim();
      if (input.length < 2) {
        return new Response(JSON.stringify({ predictions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sessionToken = body.sessionToken;
      const u = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
      u.searchParams.set("input", input);
      u.searchParams.set("language", "nl");
      u.searchParams.set("components", "country:nl|country:be|country:de|country:fr|country:lu");
      if (sessionToken) u.searchParams.set("sessiontoken", sessionToken);
      u.searchParams.set("key", apiKey);
      const r = await fetch(u);
      const j = await r.json();
      console.log("[autocomplete] input=", input, "status=", j.status, "error=", j.error_message, "count=", (j.predictions ?? []).length);
      return new Response(JSON.stringify({
        predictions: (j.predictions ?? []).map((p: any) => ({
          place_id: p.place_id,
          description: p.description,
          main: p.structured_formatting?.main_text ?? p.description,
          secondary: p.structured_formatting?.secondary_text ?? "",
        })),
        status: j.status,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "details") {
      const placeId = String(body.placeId ?? "");
      if (!placeId) {
        return new Response(JSON.stringify({ error: "placeId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const u = new URL("https://maps.googleapis.com/maps/api/place/details/json");
      u.searchParams.set("place_id", placeId);
      u.searchParams.set("language", "nl");
      u.searchParams.set("fields", "address_component,formatted_address,geometry,name");
      if (body.sessionToken) u.searchParams.set("sessiontoken", body.sessionToken);
      u.searchParams.set("key", apiKey);
      const r = await fetch(u);
      const j = await r.json();
      const result = j.result;
      if (!result) {
        return new Response(JSON.stringify({ error: "not found", status: j.status }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const comps: any[] = result.address_components ?? [];
      const get = (t: string) => comps.find((c) => c.types.includes(t))?.long_name ?? "";
      // Voorkeur voor exacte stad/dorp i.p.v. gemeente (administratief).
      // Volgorde: sublocality (kern/dorp) → locality (stad) → postal_town → neighborhood.
      // administrative_area_level_2 = gemeente — alleen als laatste fallback.
      const city =
        get("sublocality_level_1") ||
        get("sublocality") ||
        get("locality") ||
        get("postal_town") ||
        get("neighborhood") ||
        get("administrative_area_level_3") ||
        get("administrative_area_level_2") ||
        get("administrative_area_level_1");
      return new Response(JSON.stringify({
        formatted_address: result.formatted_address,
        city,
        country: get("country"),
        lat: result.geometry?.location?.lat,
        lng: result.geometry?.location?.lng,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
