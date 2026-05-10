// Franse dieselprijs (Gazole) — bron: prix-carburants.gouv.fr.
// Pagina toont de nationale gemiddelde prijs incl. TVA (20%); we slaan ex-btw op.
// Best-effort scrape; valt terug op een vaste waarde als parsing faalt.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FR_URL = "https://www.prix-carburants.gouv.fr/";
const VAT_FR = 0.20;

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
    let priceIncl: number | null = null;
    let source = "prix-carburants.gouv.fr";

    try {
      const res = await fetch(FR_URL, { headers: { "User-Agent": "Mozilla/5.0 ViaCust" } });
      if (res.ok) {
        const html = await res.text();
        // Zoek "Gazole" gevolgd door prijs in EUR
        const m =
          html.match(/Gazole[\s\S]{0,400}?(\d[.,]\d{3,4})\s*€/i) ||
          html.match(/Gazole[\s\S]{0,400}?(\d[.,]\d{3,4})/i);
        if (m) priceIncl = parseFloat(m[1].replace(",", "."));
      }
    } catch (_) { /* ignore, fall through */ }

    if (!priceIncl || !isFinite(priceIncl) || priceIncl <= 0) {
      priceIncl = 1.70;
      source = "fallback";
    }

    const priceExcl = +(priceIncl / (1 + VAT_FR)).toFixed(4);
    const week_start = isoMonday();

    const { error } = await admin
      .from("weekly_fuel_prices")
      .upsert(
        [{ week_start, eur_per_liter: priceExcl, source, country: "FR" }],
        { onConflict: "country,week_start" }
      );
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, country: "FR", week_start, eur_per_liter: priceExcl, source }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-fuel-prices-fr error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
