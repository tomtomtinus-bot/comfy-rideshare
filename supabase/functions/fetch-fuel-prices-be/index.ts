// Belgische dieselprijs (Diesel B7) — bron: FOD Economie (Petrol Prices).
// Pagina toont prijs incl. 21% btw; we slaan ex-btw op.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FOD_URL = "https://petrolprices.economie.fgov.be/petrolprices/?locale=nl";
const VAT_BE = 0.21;

function isoMonday(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const res = await fetch(FOD_URL, { headers: { "User-Agent": "Mozilla/5.0 ViaCust" } });
    if (!res.ok) throw new Error(`FOD fetch failed: ${res.status}`);
    const html = await res.text();

    // Zoek "Diesel B7 ... <number>,<number>" euro/l
    const m =
      html.match(/Diesel\s*B7[\s\S]*?(\d+[.,]\d{3,4})\s*euro\/l/i) ||
      html.match(/Diesel\s*B7[\s\S]*?(\d+[.,]\d{3,4})/i);

    let priceIncl: number | null = null;
    if (m) priceIncl = parseFloat(m[1].replace(",", "."));

    let source = "FOD";
    if (!priceIncl || !isFinite(priceIncl) || priceIncl <= 0) {
      priceIncl = 2.18;
      source = "fallback";
    }

    const priceExcl = +(priceIncl / (1 + VAT_BE)).toFixed(4);
    const week_start = isoMonday();

    const { error } = await admin
      .from("weekly_fuel_prices")
      .upsert(
        [{ week_start, eur_per_liter: priceExcl, source, country: "BE" }],
        { onConflict: "country,week_start" }
      );
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, country: "BE", week_start, eur_per_liter: priceExcl, source }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-fuel-prices-be error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
