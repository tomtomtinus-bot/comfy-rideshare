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
}

const AdminFuel = () => {
  const [rows, setRows] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("weekly_fuel_prices")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(52);
    if (error) toast.error(error.message);
    setRows((data ?? []) as FuelPrice[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const syncFromTLN = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("fetch-fuel-prices");
    setSyncing(false);
    if (error) return toast.error(error.message);
    toast.success(`TLN-sync: ${data?.weeks_upserted ?? 0} weken bijgewerkt`);
    load();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-brass-deep mb-2">Brandstofprijzen</h2>
          <p className="text-sm text-brass-deep/70">
            Wekelijks gemiddelde dieselprijs (€/liter) volgens TLN. Wordt gebruikt voor brandstoftoeslagen.
          </p>
        </div>
        <Button onClick={syncFromTLN} disabled={syncing} variant="outline">
          {syncing ? "Synchroniseren…" : "Synchroniseer met TLN"}
        </Button>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-widest font-semibold text-brass-deep mb-3">
          Geschiedenis
        </h3>
        {loading ? (
          <p className="text-sm text-brass-deep/50">Laden…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-brass-deep/50">Nog geen prijzen. Klik op "Synchroniseer met TLN".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-brass-gold/30 text-brass-deep/70 uppercase text-xs tracking-widest">
                  <th className="py-2 pr-4">Weekstart</th>
                  <th className="py-2 pr-4">€/liter</th>
                  <th className="py-2 pr-4">Bron</th>
                  <th className="py-2 pr-4">Bijgewerkt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-brass-gold/10">
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
