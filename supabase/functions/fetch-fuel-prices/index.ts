// Fetches Dutch diesel pump prices from CBS Open Data (StatLine)
// and upserts the weekly average into public.weekly_fuel_prices.
// Dataset: 80416ned — Motorbrandstoffen; consumentenprijzen, per dag
// https://opendata.cbs.nl/ODataApi/odata/80416ned

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CBS dataset 80416ned: daily Dutch motor fuel pump prices.
// Diesel column key:
const DIESEL_KEY = "Diesel_2";

function isoWeekStart(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7; // Mon=1..Sun=7
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
    // Pull last ~120 days. CBS OData v3 ignores $orderby reliably,
    // so filter by date instead.
    const since = new Date(Date.now() - 130 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10).replace(/-/g, "");
    const url =
      `https://opendata.cbs.nl/ODataApi/odata/80416ned/TypedDataSet?` +
      `$filter=${encodeURIComponent(`Perioden gt '${since}'`)}&$top=200`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`CBS fetch failed: ${res.status}`);
    const json = await res.json();
    const rows: Array<Record<string, unknown>> = json.value ?? [];
    console.log(`CBS returned ${rows.length} rows for filter since=${since}`);
    if (rows[0]) console.log(`first row sample:`, JSON.stringify(rows[0]));

    // Group by ISO week (Mon)
    const weekly = new Map<string, { sum: number; n: number }>();

    for (const row of rows) {
      // Perioden codes look like "2026W18D5" or "20260504" depending on dataset.
      // We try to parse a date from "Perioden" — if not parseable, skip.
      const period = String(row["Perioden"] ?? "").trim();
      let date: Date | null = null;

      // Format yyyymmdd
      if (/^\d{8}$/.test(period)) {
        date = new Date(`${period.slice(0, 4)}-${period.slice(4, 6)}-${period.slice(6, 8)}T00:00:00Z`);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
        date = new Date(period + "T00:00:00Z");
      }
      if (!date || isNaN(date.getTime())) continue;

      const priceRaw = row[DIESEL_KEY];
      const price = typeof priceRaw === "number" ? priceRaw : Number(priceRaw);
      if (!isFinite(price) || price <= 0) continue;

      const wk = isoWeekStart(date);
      const cur = weekly.get(wk) ?? { sum: 0, n: 0 };
      cur.sum += price;
      cur.n += 1;
      weekly.set(wk, cur);
    }

    // If CBS yielded nothing, fall back to a sensible default for current week
    // so the system keeps working — but mark source clearly.
    let upserts: Array<{ week_start: string; eur_per_liter: number; source: string }> = [];
    if (weekly.size === 0) {
      upserts.push({
        week_start: isoWeekStart(new Date()),
        eur_per_liter: 1.85,
        source: "fallback",
      });
    } else {
      upserts = Array.from(weekly.entries()).map(([week_start, { sum, n }]) => ({
        week_start,
        eur_per_liter: +(sum / n).toFixed(4),
        source: "CBS",
      }));
    }

    const { error } = await admin
      .from("weekly_fuel_prices")
      .upsert(upserts, { onConflict: "week_start" });
    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, weeks_upserted: upserts.length, sample: upserts.slice(0, 3) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
