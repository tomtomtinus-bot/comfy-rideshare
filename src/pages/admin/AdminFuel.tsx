import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface FuelPrice {
  id: string;
  week_start: string;
  eur_per_liter: number;
  source: string;
  fetched_at: string;
  country: string;
}

const COUNTRY_LABEL: Record<string, string> = {
  NL: "Nederland",
  BE: "België",
  FR: "Frankrijk",
};

const AdminFuel = () => {
  const [rows, setRows] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("weekly_fuel_prices")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(150);
    if (error) toast.error(error.message);
    setRows((data ?? []) as FuelPrice[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const sync = async (country: "NL" | "BE" | "FR") => {
    setSyncing(country);
    const fn =
      country === "NL"
        ? "fetch-fuel-prices"
        : country === "BE"
        ? "fetch-fuel-prices-be"
        : "fetch-fuel-prices-fr";
    const { data, error } = await supabase.functions.invoke(fn);
    setSyncing(null);
    if (error) return toast.error(`${COUNTRY_LABEL[country]}: ${error.message}`);
    if (data && (data as any).ok === false) {
      return toast.error(`${COUNTRY_LABEL[country]}: ${(data as any).error ?? "onbekende fout"}`);
    }
    const weeks = (data as any)?.weeks_upserted;
    const latest = (data as any)?.latest?.slice(-1)?.[0]?.week_start;
    toast.success(
      `${COUNTRY_LABEL[country]}: bijgewerkt${weeks ? ` (${weeks} weken)` : ""}${latest ? `, laatst: ${latest}` : ""}`
    );
    load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl text-brass-deep mb-2">Brandstofprijzen</h2>
        <p className="text-sm text-brass-deep/70">
          Wekelijks gemiddelde dieselprijs (€/liter, exclusief btw). Wordt gebruikt voor brandstoftoeslagen.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["NL", "BE", "FR"] as const).map((c) => (
          <Button
            key={c}
            onClick={() => sync(c)}
            disabled={syncing !== null}
            variant="outline"
          >
            {syncing === c ? "Synchroniseren…" : `Synchroniseer ${COUNTRY_LABEL[c]}`}
          </Button>
        ))}
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-widest font-semibold text-brass-deep mb-3">
          Geschiedenis
        </h3>
        {loading ? (
          <p className="text-sm text-brass-deep/50">Laden…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-brass-deep/50">Nog geen prijzen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-brass-gold/30 text-brass-deep/70 uppercase text-xs tracking-widest">
                  <th className="py-2 pr-4">Land</th>
                  <th className="py-2 pr-4">Weekstart</th>
                  <th className="py-2 pr-4">€/liter (excl. btw)</th>
                  <th className="py-2 pr-4">Bron</th>
                  <th className="py-2 pr-4">Bijgewerkt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-brass-gold/10">
                    <td className="py-2 pr-4 font-semibold">{COUNTRY_LABEL[r.country] ?? r.country}</td>
                    <td className="py-2 pr-4">{r.week_start}</td>
                    <td className="py-2 pr-4">€ {Number(r.eur_per_liter).toFixed(3)}</td>
                    <td className="py-2 pr-4">{r.source}</td>
                    <td className="py-2 pr-4 text-brass-deep/60">
                      {new Date(r.fetched_at).toLocaleDateString("nl-NL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFuel;
