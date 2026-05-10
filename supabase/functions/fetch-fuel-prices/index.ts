// Haalt het wekelijkse gemiddelde van de Nederlandse dieselprijs (af pomp, excl. btw)
// op uit de TLN Brandstofmonitor-Excel en upsert het in public.weekly_fuel_prices.
// Bron: https://www.tln.nl/ledenvoordeel/brandstofmonitor

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TLN_XLSX_URL =
  "https://cms.tln.nl/storage/media/06.Ledenvoordeel/Brandstofmonitor/Weekgemiddelde-dieselprijs.xlsx";

function isoMonday(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
}

// ISO week start (Monday) for a given (year, isoWeek).
function isoWeekStartFromYearWeek(year: number, week: number): string {
  // Jan 4 is always in ISO week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const res = await fetch(TLN_XLSX_URL);
    if (!res.ok) throw new Error(`TLN download failed: ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    const wb = XLSX.read(buf, { type: "array" });

    // Voorkeur: weekgemiddelde-sheet ('weekgemiddelde 2024 - Heden')
    const wkSheetName =
      wb.SheetNames.find((n) => n.toLowerCase().startsWith("weekgemiddelde")) ?? wb.SheetNames[0];
    const ws = wb.Sheets[wkSheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true });

    // Kolomstructuur (1-based in Excel, 0-based hier):
    // [A=null, B=week, C=weekgemiddelde, D=year (alleen op rij waar jaar wisselt)]
    let currentYear: number | null = null;
    const upserts: Array<{ week_start: string; eur_per_liter: number; source: string }> = [];

    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      const week = row[1];
      const price = row[2];
      const yearCell = row[3];

      if (typeof yearCell === "number" && yearCell >= 2000 && yearCell < 2100) {
        currentYear = yearCell;
      }
      if (typeof week !== "number" || typeof price !== "number") continue;
      if (currentYear === null) continue;
      if (!isFinite(price) || price <= 0) continue;

      const weekStart = isoWeekStartFromYearWeek(currentYear, week);
      upserts.push({
        week_start: weekStart,
        eur_per_liter: +price.toFixed(4),
        source: "TLN",
        country: "NL",
      });
    }

    // Fallback wanneer parse niets oplevert
    if (upserts.length === 0) {
      upserts.push({
        week_start: isoMonday(new Date()),
        eur_per_liter: 1.85,
        source: "fallback",
        country: "NL",
      });
    }

    // Dedupe per week_start (laatste voorkomen wint)
    const dedupedMap = new Map<string, { week_start: string; eur_per_liter: number; source: string; country: string }>();
    for (const u of upserts) dedupedMap.set(u.week_start, u);
    const deduped = Array.from(dedupedMap.values());

    const { error } = await admin
      .from("weekly_fuel_prices")
      .upsert(deduped, { onConflict: "country,week_start" });
    if (error) throw error;

    return new Response(
      JSON.stringify({
        ok: true,
        weeks_upserted: upserts.length,
        latest: upserts.slice(-3),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-fuel-prices error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
