import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FuelPrice {
  id: string;
  week_start: string;
  eur_per_liter: number;
  source: string;
  fetched_at: string;
}

const isoMonday = (d = new Date()) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date.toISOString().slice(0, 10);
};

const AdminFuel = () => {
  const [rows, setRows] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWeek, setNewWeek] = useState(isoMonday());
  const [newPrice, setNewPrice] = useState("1.85");
  const [editing, setEditing] = useState<Record<string, string>>({});

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

  const save = async (id: string, week_start: string) => {
    const val = Number(editing[id]);
    if (!isFinite(val) || val <= 0) {
      toast.error("Ongeldige prijs");
      return;
    }
    const { error } = await supabase
      .from("weekly_fuel_prices")
      .update({ eur_per_liter: val, source: "handmatig", fetched_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Prijs voor week ${week_start} bijgewerkt`);
    setEditing((e) => {
      const n = { ...e };
      delete n[id];
      return n;
    });
    load();
  };

  const upsertNew = async () => {
    const val = Number(newPrice);
    if (!isFinite(val) || val <= 0) return toast.error("Ongeldige prijs");
    const { error } = await supabase
      .from("weekly_fuel_prices")
      .upsert(
        { week_start: newWeek, eur_per_liter: val, source: "handmatig", fetched_at: new Date().toISOString() },
        { onConflict: "week_start" }
      );
    if (error) return toast.error(error.message);
    toast.success("Brandstofprijs opgeslagen");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Verwijderen?")) return;
    const { error } = await supabase.from("weekly_fuel_prices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Verwijderd");
    load();
  };

  const [syncing, setSyncing] = useState(false);
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
            Pas de gemiddelde dieselprijs (€/liter) per week aan. Wordt gebruikt voor brandstoftoeslagen.
          </p>
        </div>
        <Button onClick={syncFromTLN} disabled={syncing} variant="outline">
          {syncing ? "Synchroniseren…" : "Synchroniseer met TLN"}
        </Button>
      </div>

      <div className="bg-parchment p-5 border border-brass-gold/20">
        <h3 className="text-xs uppercase tracking-widest font-semibold text-brass-deep mb-4">
          Nieuwe / huidige week instellen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="week">Weekstart (maandag)</Label>
            <Input id="week" type="date" value={newWeek} onChange={(e) => setNewWeek(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="price">Prijs (€/liter)</Label>
            <Input
              id="price"
              type="number"
              step="0.001"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
          </div>
          <Button onClick={upsertNew}>Opslaan</Button>
        </div>
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
                  <th className="py-2 pr-4">Weekstart</th>
                  <th className="py-2 pr-4">€/liter</th>
                  <th className="py-2 pr-4">Bron</th>
                  <th className="py-2 pr-4">Bijgewerkt</th>
                  <th className="py-2 pr-4">Acties</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isEditing = editing[r.id] !== undefined;
                  return (
                    <tr key={r.id} className="border-b border-brass-gold/10">
                      <td className="py-2 pr-4">{r.week_start}</td>
                      <td className="py-2 pr-4">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.001"
                            value={editing[r.id]}
                            onChange={(e) => setEditing((s) => ({ ...s, [r.id]: e.target.value }))}
                            className="h-8 w-28"
                          />
                        ) : (
                          `€ ${Number(r.eur_per_liter).toFixed(3)}`
                        )}
                      </td>
                      <td className="py-2 pr-4">{r.source}</td>
                      <td className="py-2 pr-4 text-brass-deep/60">
                        {new Date(r.fetched_at).toLocaleDateString("nl-NL")}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => save(r.id, r.week_start)}>
                                Opslaan
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditing((e) => {
                                    const n = { ...e };
                                    delete n[r.id];
                                    return n;
                                  })
                                }
                              >
                                Annuleer
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditing((s) => ({ ...s, [r.id]: String(r.eur_per_liter) }))
                                }
                              >
                                Wijzig
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                                Verwijder
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFuel;
