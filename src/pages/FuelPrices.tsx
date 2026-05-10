import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

interface FuelPrice {
  id: string;
  week_start: string;
  eur_per_liter: number;
  source: string;
  fetched_at: string;
}

const FuelPrices = () => {
  const [rows, setRows] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);

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

  const current = rows[0];

  return (
    <div className="min-h-screen flex flex-col bg-parchment">
      <Nav />
      <main className="flex-1 max-w-4xl mx-auto px-6 md:px-8 py-10 w-full">
        <h1 className="font-display text-3xl text-brass-deep mb-2">Brandstofprijzen</h1>
        <p className="text-sm text-brass-deep/70 mb-8">
          Wekelijks gemiddelde dieselprijs (af pomp, excl. btw) volgens TLN Brandstofmonitor.
        </p>

        {current && (
          <div className="bg-brass-deep text-parchment p-6 mb-8 border border-brass-gold/30">
            <div className="text-xs uppercase tracking-widest opacity-70 mb-2">Huidige week</div>
            <div className="font-display text-4xl">€ {Number(current.eur_per_liter).toFixed(3)}/L</div>
            <div className="text-xs opacity-70 mt-2">
              Weekstart {current.week_start} · bron {current.source}
            </div>
          </div>
        )}

        <h2 className="text-xs uppercase tracking-widest font-semibold text-brass-deep mb-3">
          Geschiedenis
        </h2>
        {loading ? (
          <p className="text-sm text-brass-deep/50">Laden…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-brass-deep/50">Nog geen prijzen beschikbaar.</p>
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
      </main>
      <Footer />
    </div>
  );
};

export default FuelPrices;
