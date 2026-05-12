import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Fuel, ExternalLink } from "lucide-react";

interface FuelPrice {
  id: string;
  week_start: string;
  eur_per_liter: number;
  source: string;
  fetched_at: string;
  country: string;
}

const LABEL: Record<string, string> = { NL: "Nederland", BE: "België", FR: "Frankrijk" };

const FuelPrices = () => {
  const [rows, setRows] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("weekly_fuel_prices")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(300);
      if (error) toast.error(error.message);
      setRows((data ?? []) as FuelPrice[]);
      setLoading(false);
    })();
  }, []);

  const byCountry = useMemo(() => {
    const out: Record<string, FuelPrice[]> = {};
    for (const r of rows) (out[r.country] ??= []).push(r);
    return out;
  }, [rows]);

  const available = ["NL", "BE", "FR"].filter((c) => (byCountry[c] ?? []).length > 0);
  const initial = available[0] ?? "NL";

  return (
    <div className="min-h-screen flex flex-col bg-parchment">
      <Nav />
      <main className="flex-1 max-w-4xl mx-auto px-6 md:px-8 py-10 w-full">
        <h1 className="font-display text-3xl text-brass-deep mb-2">Brandstofprijzen</h1>
        <p className="text-sm text-brass-deep/70 mb-4">
          Wekelijks gemiddelde dieselprijs (€/liter, exclusief btw). Buitenlandse prijzen
          zijn alleen zichtbaar voor begeleiders die in dat land wonen.
        </p>
        <a
          href="https://www.google.com/maps/search/?api=1&query=tankstation"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mb-8"
        >
          <Button variant="outline" className="gap-2">
            <Fuel className="size-4" />
            Vind tankstation in de buurt
            <ExternalLink className="size-3.5 opacity-60" />
          </Button>
        </a>

        {loading ? (
          <p className="text-sm text-brass-deep/50">Laden…</p>
        ) : available.length === 0 ? (
          <p className="text-sm text-brass-deep/50">Nog geen prijzen beschikbaar.</p>
        ) : (
          <Tabs defaultValue={initial}>
            <TabsList>
              {available.map((c) => (
                <TabsTrigger key={c} value={c}>{LABEL[c]}</TabsTrigger>
              ))}
            </TabsList>
            {available.map((c) => {
              const list = byCountry[c] ?? [];
              const current = list[0];
              return (
                <TabsContent key={c} value={c} className="mt-6">
                  {current && (() => {
                    const ws = new Date(current.week_start);
                    const we = new Date(ws);
                    we.setDate(we.getDate() + 6);
                    const fmt = (d: Date) => d.toLocaleDateString("nl-NL", { day: "2-digit", month: "short" });
                    return (
                      <div className="bg-brass-deep text-parchment p-6 mb-6 border border-brass-gold/30">
                        <div className="text-xs uppercase tracking-widest opacity-70 mb-2">
                          Afgelopen week ({fmt(ws)} — {fmt(we)}) · {LABEL[c]}
                        </div>
                        <div className="font-display text-4xl">
                          € {Number(current.eur_per_liter).toFixed(3)}/L
                        </div>
                        <div className="text-xs opacity-70 mt-2">
                          Gemiddelde van ma t/m zo · bron {current.source}
                        </div>
                      </div>
                    );
                  })()}
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
                        {list.map((r) => (
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
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default FuelPrices;
