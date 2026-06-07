import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, TrendingDown, TrendingUp, Minus } from "lucide-react";
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
      <main className="flex-1 max-w-5xl mx-auto px-6 md:px-8 py-6 md:py-8 w-full">
        <header className="space-y-1 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Brandstofprijzen &amp; Indexering</h1>
          <p className="text-sm text-muted-foreground">
            Officiële referentieprijzen en TLN-indexcijfers.
          </p>
        </header>

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
              const prev = list[1];
              const trendPct =
                current && prev && Number(prev.eur_per_liter) > 0
                  ? ((Number(current.eur_per_liter) - Number(prev.eur_per_liter)) /
                      Number(prev.eur_per_liter)) *
                    100
                  : null;

              return (
                <TabsContent key={c} value={c} className="mt-6 space-y-6">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-input">
                      <CardContent className="p-5 space-y-1">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                          Actuele dieselprijs
                        </div>
                        <div className="text-3xl font-bold tabular-nums">
                          € {current ? Number(current.eur_per_liter).toFixed(3) : "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Gemiddelde pompprijs per liter, excl. btw
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-input">
                      <CardContent className="p-5 space-y-1">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                          TLN diesel-index
                        </div>
                        <div className="text-3xl font-bold tabular-nums text-muted-foreground">
                          —
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Punten t.o.v. basisjaar (publicatie volgt)
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-input">
                      <CardContent className="p-5 space-y-1">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">
                          Trend (vorige week)
                        </div>
                        <div className="text-3xl font-bold tabular-nums flex items-center gap-2">
                          {trendPct === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <>
                              {trendPct > 0 ? (
                                <TrendingUp className="size-6 text-foreground" />
                              ) : trendPct < 0 ? (
                                <TrendingDown className="size-6 text-foreground" />
                              ) : (
                                <Minus className="size-6 text-muted-foreground" />
                              )}
                              {trendPct > 0 ? "+" : ""}
                              {trendPct.toFixed(2)}%
                            </>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Procentuele wijziging dieselprijs
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* History Table */}
                  <div className="rounded-md border border-input bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Dieselprijs per liter (excl. btw)</TableHead>
                          <TableHead>TLN indexcijfer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="tabular-nums">{r.week_start}</TableCell>
                            <TableCell className="tabular-nums font-medium">
                              € {Number(r.eur_per_liter).toFixed(3)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">—</TableCell>
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

        <Alert className="mt-8 border-input">
          <Info className="size-4" />
          <AlertDescription className="text-xs text-muted-foreground">
            ViaCust is een onafhankelijk platform. Wij publiceren uitsluitend officiële
            marktdata en indexcijfers. ViaCust verstrekt geen adviezen omtrent tarieven of
            toeslagen; deze worden rechtstreeks tussen de marktpartijen overeengekomen.
          </AlertDescription>
        </Alert>
      </main>
      <Footer />
    </div>
  );
};

export default FuelPrices;
