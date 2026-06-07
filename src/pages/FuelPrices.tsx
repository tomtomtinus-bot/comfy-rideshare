import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Fuel, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Nav />
      <main className="flex-1 max-w-4xl mx-auto px-6 md:px-8 py-6 md:py-8 w-full">
        <header className="space-y-1 mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Brandstofprijzen</h1>
          <p className="text-sm text-muted-foreground">
            Wekelijks gemiddelde dieselprijs (€/liter, exclusief btw). Buitenlandse prijzen
            zijn alleen zichtbaar voor begeleiders die in dat land wonen.
          </p>
        </header>

        <a
          href="https://www.google.com/maps/search/?api=1&query=tankstation"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mb-6"
        >
          <Button variant="outline" size="sm" className="gap-2">
            <Fuel className="size-4" />
            Vind tankstation in de buurt
            <ExternalLink className="size-3.5 opacity-60" />
          </Button>
        </a>

        {loading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen prijzen beschikbaar.</p>
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
                <TabsContent key={c} value={c} className="mt-6 space-y-6">
                  {current && (() => {
                    const ws = new Date(current.week_start);
                    const we = new Date(ws);
                    we.setDate(we.getDate() + 6);
                    const fmt = (d: Date) => d.toLocaleDateString("nl-NL", { day: "2-digit", month: "short" });
                    return (
                      <div className="rounded-md border border-input bg-card p-5">
                        <div className="text-xs text-muted-foreground mb-2">
                          Afgelopen week ({fmt(ws)} — {fmt(we)}) · {LABEL[c]}
                        </div>
                        <div className="text-3xl font-semibold tracking-tight">
                          € {Number(current.eur_per_liter).toFixed(3)}<span className="text-lg font-medium text-muted-foreground">/L</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Gemiddelde van ma t/m zo · bron {current.source}
                        </div>
                      </div>
                    );
                  })()}
                  <div className="rounded-md border border-input bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Weekstart</TableHead>
                          <TableHead>€/liter</TableHead>
                          <TableHead>Bron</TableHead>
                          <TableHead>Bijgewerkt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="tabular-nums">{r.week_start}</TableCell>
                            <TableCell className="tabular-nums font-medium">€ {Number(r.eur_per_liter).toFixed(3)}</TableCell>
                            <TableCell>{r.source}</TableCell>
                            <TableCell className="text-muted-foreground tabular-nums">
                              {new Date(r.fetched_at).toLocaleDateString("nl-NL")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
