import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface RideRow {
  id: string;
  ride_number: string | null;
  client_id: string;
  pickup_city: string;
  dropoff_city: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_at: string;
  num_escorts: number;
  status: string;
  app_fee: number;
  client_name?: string;
  assignment_count?: number;
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });

const STATUSES = ["open", "matched", "in_progress", "completed", "cancelled"];

const AdminRides = () => {
  const [rides, setRides] = useState<RideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: rs, error } = await supabase
      .from("rides")
      .select("id, client_id, pickup_city, dropoff_city, pickup_address, dropoff_address, scheduled_at, num_escorts, status, app_fee")
      .order("scheduled_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (rs ?? []) as RideRow[];
    const clientIds = [...new Set(list.map((r) => r.client_id))];
    const rideIds = list.map((r) => r.id);
    const [{ data: profs }, { data: ass }] = await Promise.all([
      clientIds.length
        ? supabase.from("profiles").select("id, full_name, company_name").in("id", clientIds)
        : Promise.resolve({ data: [] as any[] }),
      rideIds.length
        ? supabase.from("ride_assignments").select("ride_id, status").in("ride_id", rideIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p.company_name || p.full_name || "—"]));
    const aMap = new Map<string, number>();
    (ass ?? []).forEach((a: any) => {
      if (a.status !== "declined" && a.status !== "expired" && a.status !== "cancelled") {
        aMap.set(a.ride_id, (aMap.get(a.ride_id) ?? 0) + 1);
      }
    });
    setRides(list.map((r) => ({ ...r, client_name: pMap.get(r.client_id), assignment_count: aMap.get(r.id) ?? 0 })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("rides").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status bijgewerkt");
      load();
    }
  };

  const cancelRide = async (id: string) => {
    if (!confirm("Rit annuleren? Bestaande toewijzingen worden geannuleerd.")) return;
    const { error: e1 } = await supabase.from("rides").update({ status: "cancelled" as any }).eq("id", id);
    const { error: e2 } = await supabase
      .from("ride_assignments")
      .update({ status: "cancelled" as any })
      .eq("ride_id", id)
      .in("status", ["invited", "accepted"]);
    if (e1 || e2) toast.error((e1 ?? e2)!.message);
    else {
      toast.success("Rit geannuleerd");
      load();
    }
  };

  const filtered = rides.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      r.id.toLowerCase().includes(q) ||
      r.pickup_city.toLowerCase().includes(q) ||
      r.dropoff_city.toLowerCase().includes(q) ||
      (r.client_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl text-brass-deep">Ritten</h2>
        <p className="text-sm text-brass-deep/80 mt-1">Alle ritten op het platform.</p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
        >
          <option value="all">Alle statussen</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op ritnummer, stad of opdrachtgever…"
          className="flex-1 min-w-[200px] bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
        />
      </div>

      {loading ? (
        <p className="text-sm text-brass-deep/80">Laden…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-brass-deep/80">Geen ritten gevonden.</p>
      ) : (
        <ul className="space-y-px bg-brass-deep/10">
          {filtered.map((r) => (
            <li key={r.id} className="bg-card p-4 md:p-5">
              <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-12 md:col-span-3">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">Ritnr · Datum</p>
                  <p className="font-mono text-[11px] text-brass-deep/80 tabular-nums">#{r.id.slice(0, 8).toUpperCase()}</p>
                  <p className="font-medium tabular-nums text-sm">{fmt(r.scheduled_at)}</p>
                  <p className="text-[10px] text-brass-deep/80 mt-1">{r.client_name}</p>
                </div>
                <div className="col-span-12 md:col-span-5">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">Route</p>
                  <p className="text-sm font-medium">
                    {r.pickup_city} <span className="text-brass-gold mx-2">→</span> {r.dropoff_city}
                  </p>
                  <p className="text-[10px] text-brass-deep/80 mt-1">
                    {r.num_escorts} begeleider{r.num_escorts === 1 ? "" : "s"} · {r.assignment_count} toewijzing{r.assignment_count === 1 ? "" : "en"}
                  </p>
                </div>
                <div className="col-span-12 md:col-span-4 md:text-right space-y-2">
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                    className="bg-parchment border border-brass-deep/15 px-2 py-1.5 text-xs focus:outline-none focus:border-brass-gold"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {r.status !== "cancelled" && (
                    <button
                      onClick={() => cancelRide(r.id)}
                      className="block md:ml-auto text-[10px] uppercase tracking-widest font-semibold text-red-700 hover:underline"
                    >
                      Annuleer rit
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminRides;
