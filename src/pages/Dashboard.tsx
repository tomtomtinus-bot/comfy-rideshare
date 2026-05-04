import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { AgendaPlanner } from "@/components/site/AgendaPlanner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const fmtHours = (min: number) => {
  const total = Math.ceil(min / 15) * 15;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}u`;
  return `${h}u ${m}m`;
};

const QUARTER_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

interface RideRow {
  id: string;
  client_id: string;
  pickup_address: string;
  pickup_city: string;
  dropoff_address: string;
  dropoff_city: string;
  scheduled_at: string;
  num_escorts: number;
  status: string;
  notes: string | null;
  app_fee: number;
  cargo_length_m?: number | null;
  cargo_width_m?: number | null;
  cargo_height_m?: number | null;
  cargo_weight_t?: number | null;
  permit_number?: string | null;
  permit_id?: string | null;
  client_reference?: string | null;
  escort_type_required?: string | null;
}

interface AssignmentRow {
  id: string;
  ride_id: string;
  escort_id: string;
  travel_to_pickup_min: number;
  travel_back_home_min: number;
  estimated_hours: number | null;
  estimated_cost: number | null;
  actual_hours: number | null;
  actual_cost: number | null;
  hours_submitted_at: string | null;
  hours_notes: string | null;
  status: "invited" | "accepted" | "declined" | "expired" | "cancelled";
  invited_at: string;
  responds_by: string;
  responded_at: string | null;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    open: "Open",
    matched: "Toegewezen",
    in_progress: "Onderweg",
    completed: "Voltooid",
    cancelled: "Geannuleerd",
    invited: "Uitgenodigd",
    accepted: "Geaccepteerd",
    declined: "Geweigerd",
    expired: "Verlopen",
  };
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brass-gold">
      <span className="size-1.5 rounded-full bg-brass-gold" />
      {map[status] ?? status}
    </span>
  );
};

const minutesLeft = (deadline: string) => {
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 60000));
};

const ClientDashboard = () => {
  const { user } = useAuth();
  const [rides, setRides] = useState<RideRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, (AssignmentRow & { anon: string; rate: number })[]>>({});
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [escortNames, setEscortNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: rs } = await supabase
        .from("rides")
        .select("*")
        .eq("client_id", user.id)
        .is("platform_invoice_id", null)
        .order("scheduled_at", { ascending: false });

      const list = rs ?? [];
      setRides(list);

      if (list.length) {
        const ids = list.map((r) => r.id);
        const { data: ass } = await supabase
          .from("ride_assignments")
          .select("*")
          .in("ride_id", ids);

        const escortIds = [...new Set((ass ?? []).map((a) => a.escort_id))];
        const { data: escorts } = await supabase
          .from("escort_profiles")
          .select("id, anonymous_id, hourly_rate")
          .in("id", escortIds);
        const escortMap = new Map((escorts ?? []).map((e) => [e.id, e]));

        const grouped: Record<string, (AssignmentRow & { anon: string; rate: number })[]> = {};
        (ass ?? []).forEach((a) => {
          const e = escortMap.get(a.escort_id);
          (grouped[a.ride_id] ||= []).push({
            ...a,
            anon: e?.anonymous_id ?? "—",
            rate: Number(e?.hourly_rate ?? 0),
          });
        });
        setAssignments(grouped);

        const acceptedAssignmentIds = (ass ?? [])
          .filter((a: any) => a.status === "accepted" || a.hours_submitted_at)
          .map((a: any) => a.id as string);
        if (acceptedAssignmentIds.length) {
          const results = await Promise.all(
            acceptedAssignmentIds.map(async (id) => {
              const { data } = await supabase.rpc("get_counterparty_name", { _assignment_id: id });
              const row = (data as any[])?.[0];
              return [id, row?.name as string | undefined] as const;
            }),
          );
          const next: Record<string, string> = {};
          results.forEach(([id, name]) => {
            if (name) next[id] = name;
          });
          setEscortNames(next);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const exportXlsx = () => {
    let filtered = rides;
    if (exportFrom) {
      const f = new Date(exportFrom).getTime();
      filtered = filtered.filter((r) => new Date(r.scheduled_at).getTime() >= f);
    }
    if (exportTo) {
      const t = new Date(exportTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      filtered = filtered.filter((r) => new Date(r.scheduled_at).getTime() <= t);
    }
    if (filtered.length === 0) return toast.error("Geen ritten in dit tijdsbestek");
    const rows = filtered.map((r) => {
      const ass = assignments[r.id] ?? [];
      const escortIds = ass.map((a) => `#${a.anon}`).join(", ");
      const totalEst = ass.reduce((s, a) => s + Number(a.estimated_cost ?? 0), 0);
      const totalActual = ass.reduce((s, a) => s + Number(a.actual_cost ?? 0), 0);
      const allSubmitted = ass.length > 0 && ass.every((a) => a.hours_submitted_at);
      return {
        "Datum": fmtDate(r.scheduled_at),
        "Rit ID": r.id.slice(0, 8),
        "Referentie": r.client_reference ?? "",
        "Vergunning": r.permit_number ?? "",
        "Vertrek": `${r.pickup_address} (${r.pickup_city})`,
        "Bestemming": `${r.dropoff_address} (${r.dropoff_city})`,
        "Aantal begeleiders": r.num_escorts,
        "Begeleiders": escortIds,
        "Status": r.status,
        "Geschatte kosten (€)": +totalEst.toFixed(2),
        "Werkelijke kosten (€)": allSubmitted ? +totalActual.toFixed(2) : null,
        "Servicekosten (€)": Number(r.app_fee ?? 0),
        "Totaal incl. fee (€)": allSubmitted ? +(totalActual + Number(r.app_fee ?? 0)).toFixed(2) : null,
        "Opmerkingen": r.notes ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map((k) => ({ wch: Math.max(k.length, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ritten");
    const range = exportFrom || exportTo ? `-${exportFrom || "begin"}_tot_${exportTo || "eind"}` : "";
    XLSX.writeFile(wb, `rittenadministratie${range}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel-bestand gedownload");
    setExportOpen(false);
  };

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            Opdrachtgever
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">Mijn ritten</h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={rides.length === 0}
            className="px-6 py-3 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep hover:text-parchment transition-colors disabled:opacity-50"
          >
            Download Excel
          </button>
          <Link
            to="/aanvragen"
            className="px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
          >
            Nieuwe rit aanvragen
          </Link>
        </div>
      </header>

      {exportOpen && (
        <div className="bg-card shadow-etched p-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Van</label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="border border-brass-deep/30 px-3 py-2 text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Tot</label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="border border-brass-deep/30 px-3 py-2 text-sm bg-background"
            />
          </div>
          <button
            onClick={() => { setExportFrom(""); setExportTo(""); }}
            className="px-4 py-2 text-xs uppercase tracking-widest text-brass-deep/60 hover:text-brass-deep"
          >
            Wissen
          </button>
          <button
            onClick={exportXlsx}
            className="px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
          >
            Exporteren
          </button>
          <p className="text-xs text-brass-deep/50 ml-auto">Laat leeg voor alle ritten</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-brass-deep/50">Laden…</p>
      ) : rides.length === 0 ? (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/60 mb-6">U heeft nog geen ritten aangevraagd.</p>
          <Link to="/aanvragen" className="text-brass-gold uppercase tracking-widest text-xs font-semibold">
            Vraag uw eerste rit aan →
          </Link>
        </div>
      ) : (() => {
        const categorize = (r: RideRow) => {
          const ass = assignments[r.id] ?? [];
          const allSubmitted = ass.length > 0 && ass.every((a) => a.hours_submitted_at);
          if (r.status === "completed" || allSubmitted) return "afgerond";
          const hasAccepted = ass.some((a) => a.status === "accepted");
          if (hasAccepted) return "geaccepteerd";
          return "openstaand";
        };
        const buckets = {
          openstaand: rides.filter((r) => categorize(r) === "openstaand"),
          geaccepteerd: rides.filter((r) => categorize(r) === "geaccepteerd"),
          afgerond: rides.filter((r) => categorize(r) === "afgerond"),
        };

        const renderList = (list: RideRow[]) => {
          if (list.length === 0) {
            return <p className="text-sm text-brass-deep/50 p-6">Geen ritten in deze categorie.</p>;
          }
          return (
            <ul className="space-y-px bg-brass-deep/10">
              {list.map((r) => {
                const ass = assignments[r.id] ?? [];
                const totalActual = ass.reduce((s, a) => s + Number(a.actual_cost ?? 0), 0);
                const allSubmitted = ass.length > 0 && ass.every((a) => a.hours_submitted_at);
                return (
                  <li key={r.id} className="bg-card p-6 md:p-8">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-12 md:col-span-3">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Datum</p>
                        <p className="font-medium tabular-nums">{fmtDate(r.scheduled_at)}</p>
                        <div className="mt-3"><StatusBadge status={r.status} /></div>
                      </div>
                      <div className="col-span-12 md:col-span-5">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Route</p>
                        <p className="font-medium">
                          {r.pickup_address} ({r.pickup_city})
                          <span className="text-brass-gold mx-2">→</span>
                          {r.dropoff_address} ({r.dropoff_city})
                        </p>
                        {(r.cargo_length_m || r.cargo_weight_t) && (
                          <p className="text-xs text-brass-deep/60 mt-2 tabular-nums">
                            Lading: {r.cargo_length_m}m × {r.cargo_width_m}m × {r.cargo_height_m}m · {r.cargo_weight_t}t
                            {r.permit_number ? ` · vergunning ${r.permit_number}` : ""}
                            {r.client_reference ? ` · ref ${r.client_reference}` : ""}
                          </p>
                        )}
                        
                        {r.notes && <p className="text-sm text-brass-deep/55 mt-2">{r.notes}</p>}
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Werkelijk</p>
                        <p className="font-semibold tabular-nums text-brass-gold">
                          {allSubmitted ? `€${(totalActual * 1.01).toFixed(2)}` : "—"}
                        </p>
                        {allSubmitted && (
                          <p className="text-[10px] text-brass-deep/50 mt-1">
                            incl. 1,5% fee (€{(totalActual * 0.015).toFixed(2)})
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-brass-deep/10 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ass.map((a) => {
                        const statusLabel: Record<string, string> = {
                          invited: "uitgenodigd",
                          accepted: "geaccepteerd",
                          declined: "geweigerd",
                          expired: "verlopen",
                          cancelled: "geannuleerd",
                        };
                        return (
                          <div key={a.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                              Begeleider <span className="text-brass-deep">#{a.anon}</span>
                              {escortNames[a.id] ? (
                                <span className="ml-2 text-brass-deep/70">· {escortNames[a.id]}</span>
                              ) : null}
                              <span className="ml-2 text-[10px] uppercase tracking-widest text-brass-gold font-bold">
                                {statusLabel[a.status] ?? a.status}
                              </span>
                            </span>
                            <span className="text-brass-deep/60 tabular-nums">
                              {a.actual_hours
                                ? `${a.actual_hours}u · €${Number(a.actual_cost).toFixed(2)}`
                                : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        };

        return (
          <Tabs defaultValue="openstaand" className="w-full">
            <TabsList className="grid grid-cols-3 w-full md:w-auto md:inline-flex">
              <TabsTrigger value="openstaand">Openstaand ({buckets.openstaand.length})</TabsTrigger>
              <TabsTrigger value="geaccepteerd">Geaccepteerd ({buckets.geaccepteerd.length})</TabsTrigger>
              <TabsTrigger value="afgerond">Afgerond ({buckets.afgerond.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="openstaand" className="mt-6">{renderList(buckets.openstaand)}</TabsContent>
            <TabsContent value="geaccepteerd" className="mt-6">{renderList(buckets.geaccepteerd)}</TabsContent>
            <TabsContent value="afgerond" className="mt-6">{renderList(buckets.afgerond)}</TabsContent>
          </Tabs>
        );
      })()}
    </div>
  );
};

const hoursSchema = z.object({
  ride_start_date: z.string().min(1, "Startdatum vereist"),
  ride_start_time: z.string().min(1, "Starttijd vereist"),
  ride_end_date: z.string().min(1, "Einddatum vereist"),
  ride_end_time: z.string().min(1, "Eindtijd vereist"),
  hours_notes: z.string().trim().max(500).optional(),
});

type ExtraCost = { description: string; amount: number };

const EscortDashboard = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<
    (AssignmentRow & {
      ride: RideRow;
      hourly_rate: number;
      is_be_ride: boolean;
      min_billable_hours: number;
      client_anon: string;
    })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [counterpartyNames, setCounterpartyNames] = useState<Record<string, string>>({});
  const [extraCosts, setExtraCosts] = useState<Record<string, ExtraCost[]>>({});
  const [tick, setTick] = useState(0);

  const getExtras = (id: string) => extraCosts[id] ?? [];
  const setExtras = (id: string, next: ExtraCost[]) =>
    setExtraCosts((prev) => ({ ...prev, [id]: next }));
  const addExtra = (id: string) =>
    setExtras(id, [...getExtras(id), { description: "", amount: 0 }]);
  const updateExtra = (id: string, idx: number, patch: Partial<ExtraCost>) => {
    const list = [...getExtras(id)];
    list[idx] = { ...list[idx], ...patch };
    setExtras(id, list);
  };
  const removeExtra = (id: string, idx: number) =>
    setExtras(id, getExtras(id).filter((_, i) => i !== idx));

  // Tick every 30s for the countdown timer
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: a } = await supabase
      .from("ride_assignments")
      .select("*")
      .eq("escort_id", user.id)
      .is("invoiced_at", null);
    const list = a ?? [];

    const rideIds = list.map((x) => x.ride_id);
    const { data: rides } = await supabase.from("rides").select("*").in("id", rideIds);
    const clientIds = [...new Set((rides ?? []).map((r) => r.client_id))];
    const { data: clients } = await supabase
      .from("profiles")
      .select("id, anonymous_id")
      .in("id", clientIds);
    const clientMap = new Map((clients ?? []).map((c) => [c.id, c.anonymous_id]));

    const { data: me } = await supabase
      .from("escort_profiles")
      .select("hourly_rate, hourly_rate_be, min_billable_hours")
      .eq("id", user.id)
      .maybeSingle();

    const rideMap = new Map((rides ?? []).map((r) => [r.id, r]));
    const merged = list
      .map((x) => {
        const ride = rideMap.get(x.ride_id) as RideRow | undefined;
        const isBe = ride
          ? /belgi|brussel|antwerp|gent|luik|liege|brugge|charleroi|namur|namen|leuven|mechelen|hasselt|kortrijk/i.test(
              `${ride.pickup_city ?? ""} ${ride.dropoff_city ?? ""} ${ride.pickup_address ?? ""} ${ride.dropoff_address ?? ""}`,
            )
          : false;
        const rate = isBe
          ? Number((me as any)?.hourly_rate_be ?? me?.hourly_rate ?? 0)
          : Number(me?.hourly_rate ?? 0);
        return {
          ...x,
          ride: ride as RideRow,
          hourly_rate: rate,
          is_be_ride: isBe,
          min_billable_hours: Number((me as any)?.min_billable_hours ?? 0),
          client_anon: ride ? clientMap.get(ride.client_id) ?? "—" : "—",
        };
      })
      .filter((x) => x.ride)
      .sort((a, b) => {
        // Show invited first, then by date
        if (a.status === "invited" && b.status !== "invited") return -1;
        if (b.status === "invited" && a.status !== "invited") return 1;
        return new Date(b.ride.scheduled_at).getTime() - new Date(a.ride.scheduled_at).getTime();
      });

    setItems(merged);
    setLoading(false);

    // Resolve real names for accepted assignments only
    const acceptedIds = merged
      .filter((m) => m.status === "accepted" || m.hours_submitted_at)
      .map((m) => m.id);
    if (acceptedIds.length) {
      const results = await Promise.all(
        acceptedIds.map(async (id) => {
          const { data } = await supabase.rpc("get_counterparty_name", { _assignment_id: id });
          const row = (data as any[])?.[0];
          return [id, row?.name as string | undefined] as const;
        }),
      );
      const next: Record<string, string> = {};
      results.forEach(([id, name]) => {
        if (name) next[id] = name;
      });
      setCounterpartyNames(next);
    }
  };

  useEffect(() => {
    load();
    if (!user) return;
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Realtime: new invitations
    const channel = supabase
      .channel(`escort-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_assignments", filter: `escort_id=eq.${user.id}` },
        () => {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Nieuwe rituitnodiging", {
              body: "U heeft 10 minuten om te accepteren.",
            });
          }
          toast.info("Nieuwe rituitnodiging ontvangen");
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const respond = async (id: string, accept: boolean) => {
    const { error } = await supabase
      .from("ride_assignments")
      .update({
        status: accept ? "accepted" : "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    if (accept) {
      const { error: nErr } = await supabase.rpc("notify_ride_confirmed", { _assignment_id: id });
      if (nErr) console.warn("notify_ride_confirmed:", nErr.message);
      toast.success("Rit bevestigd — opdrachtgever is op de hoogte gebracht");
    } else {
      toast.success("Rit geweigerd");
    }
    load();
  };
  void tick;

  const submitHours = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = hoursSchema.safeParse({
      ride_start_date: fd.get("ride_start_date"),
      ride_start_time: fd.get("ride_start_time"),
      ride_end_date: fd.get("ride_end_date"),
      ride_end_time: fd.get("ride_end_time"),
      hours_notes: fd.get("hours_notes"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    const rideStart = new Date(`${parsed.data.ride_start_date}T${parsed.data.ride_start_time}`);
    const rideEnd = new Date(`${parsed.data.ride_end_date}T${parsed.data.ride_end_time}`);
    if (isNaN(rideStart.getTime()) || isNaN(rideEnd.getTime())) return toast.error("Ongeldige datum of tijd");
    if (rideStart.getMinutes() % 15 !== 0 || rideEnd.getMinutes() % 15 !== 0) {
      return toast.error("Tijden moeten op het kwartier vallen (00, 15, 30, 45)");
    }
    if (rideEnd <= rideStart) return toast.error("Eindtijd rit moet na starttijd liggen");

    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Reistijd afronden naar boven op kwartieren
    const ceilQuarter = (min: number) => Math.ceil(min / 15) * 15;
    const travelTo = ceilQuarter(item.travel_to_pickup_min);
    const travelBack = ceilQuarter(item.travel_back_home_min);
    // Vertrek standplaats = starttijd rit − reistijd heen
    // Terug standplaats = eindtijd rit + reistijd terug
    const start = new Date(rideStart.getTime() - travelTo * 60_000);
    const end = new Date(rideEnd.getTime() + travelBack * 60_000);

    const rawHours = +((end.getTime() - start.getTime()) / 1000 / 3600).toFixed(2);
    // Minimumtarief op urenbasis toepassen
    const billableHours = Math.max(rawHours, item.min_billable_hours || 0);
    const hours = +billableHours.toFixed(2);
    const baseCost = +(hours * item.hourly_rate).toFixed(2);

    // Extra kosten: opschonen + valideren
    const extrasRaw = getExtras(id);
    const extras: ExtraCost[] = extrasRaw
      .map((e) => ({ description: (e.description ?? "").trim(), amount: Number(e.amount) || 0 }))
      .filter((e) => e.description.length > 0 || e.amount > 0);
    if (extras.some((e) => !e.description || e.amount <= 0)) {
      return toast.error("Vul voor elke extra kostenregel een omschrijving en een bedrag groter dan 0 in");
    }
    const extrasTotal = +extras.reduce((s, e) => s + e.amount, 0).toFixed(2);
    const cost = +(baseCost + extrasTotal).toFixed(2);

    const { error } = await supabase
      .from("ride_assignments")
      .update({
        departed_base_at: start.toISOString(),
        returned_base_at: end.toISOString(),
        actual_hours: hours,
        actual_cost: cost,
        extra_costs: extras as never,
        extra_costs_total: extrasTotal,
        hours_notes: parsed.data.hours_notes || null,
        hours_submitted_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return toast.error(error.message);

    // Mark ride completed if all assignments submitted
    const { data: remaining } = await supabase
      .from("ride_assignments")
      .select("id, hours_submitted_at")
      .eq("ride_id", item.ride_id);
    if ((remaining ?? []).every((r) => r.hours_submitted_at)) {
      await supabase.from("rides").update({ status: "completed" }).eq("id", item.ride_id);
    }

    toast.success("Uren geregistreerd");
    setOpenId(null);
    load();
  };

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            Begeleider
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">Mijn opdrachten</h1>
        </div>
        <Link
          to="/profiel"
          className="px-6 py-3 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep hover:text-parchment transition-colors"
        >
          Mijn profiel
        </Link>
      </header>

      {user && (
        <AgendaPlanner
          escortId={user.id}
          rides={items
            .filter((i) => i.status === "accepted" || i.status === "invited")
            .map((i) => ({
              id: i.ride.id,
              scheduled_at: i.ride.scheduled_at,
              pickup_city: i.ride.pickup_city,
              dropoff_city: i.ride.dropoff_city,
            }))}
        />
      )}

      {loading ? (
        <p className="text-sm text-brass-deep/50">Laden…</p>
      ) : items.length === 0 ? (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/60">U heeft nog geen toegewezen ritten.</p>
        </div>
      ) : (() => {
        const isExpired = (a: typeof items[number]) =>
          a.status === "invited" && new Date(a.responds_by).getTime() <= Date.now();
        const categorize = (a: typeof items[number]) => {
          if (a.status === "expired" || isExpired(a)) return "verlopen";
          if (a.hours_submitted_at) return "afgerond";
          if (a.status === "accepted") return "geaccepteerd";
          if (a.status === "invited") return "openstaand";
          return "afgerond"; // declined / cancelled bij historie
        };
        const buckets = {
          openstaand: items.filter((a) => categorize(a) === "openstaand"),
          geaccepteerd: items.filter((a) => categorize(a) === "geaccepteerd"),
          afgerond: items.filter((a) => categorize(a) === "afgerond"),
          verlopen: items.filter((a) => categorize(a) === "verlopen"),
        };

        const renderItem = (a: typeof items[number]) => {
          const submitted = !!a.hours_submitted_at;
          const isInvited = a.status === "invited";
          const minsLeft = isInvited ? minutesLeft(a.responds_by) : 0;
          const expired = isInvited && minsLeft === 0;
          const accepted = a.status === "accepted";
          return (
            <li key={a.id} className={`bg-card p-6 md:p-8 ${isInvited && !expired ? "ring-2 ring-inset ring-brass-gold" : ""}`}>
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-12 md:col-span-3">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Datum</p>
                  <p className="font-medium tabular-nums">{fmtDate(a.ride.scheduled_at)}</p>
                  <p className="text-xs text-brass-deep/55 mt-1">
                    Opdrachtgever #{a.client_anon}
                    {counterpartyNames[a.id] ? ` · ${counterpartyNames[a.id]}` : ""}
                  </p>
                  <div className="mt-2"><StatusBadge status={a.status} /></div>
                </div>
                <div className="col-span-12 md:col-span-7">
                  {isInvited ? (
                    <>
                      <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Route</p>
                      <p className="font-medium">
                        {a.ride.pickup_city} <span className="text-brass-gold mx-2">→</span> {a.ride.dropoff_city}
                      </p>
                      <p className="text-sm text-brass-deep/55 mt-2">
                        Reistijd vanaf basis: {fmtHours(a.travel_to_pickup_min)} · Terug: {fmtHours(a.travel_back_home_min)}
                      </p>
                      {(a.ride.cargo_length_m || a.ride.cargo_weight_t) && (
                        <p className="text-xs text-brass-deep/60 mt-2 tabular-nums">
                          Lading: {a.ride.cargo_length_m}m × {a.ride.cargo_width_m}m × {a.ride.cargo_height_m}m · {a.ride.cargo_weight_t}t
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Route</p>
                      <p className="font-medium">
                        {a.ride.pickup_city} <span className="text-brass-gold mx-2">→</span> {a.ride.dropoff_city}
                      </p>
                      <p className="text-sm text-brass-deep/55 mt-2">
                        Reistijd vanaf basis: {fmtHours(a.travel_to_pickup_min)} · Terug: {fmtHours(a.travel_back_home_min)}
                      </p>
                      {(a.ride.cargo_length_m || a.ride.cargo_weight_t) && (
                        <p className="text-xs text-brass-deep/60 mt-1 tabular-nums">
                          Lading: {a.ride.cargo_length_m}m × {a.ride.cargo_width_m}m × {a.ride.cargo_height_m}m · {a.ride.cargo_weight_t}t
                          {a.ride.permit_number ? ` · ${a.ride.permit_number}` : ""}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="col-span-6 md:col-span-2 text-right">
                  {isInvited && !expired ? (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">
                        Nog {minsLeft} min
                      </p>
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => respond(a.id, true)}
                          className="px-3 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
                        >
                          Accepteer
                        </button>
                        <button
                          onClick={() => respond(a.id, false)}
                          className="px-3 py-2 border border-brass-deep/30 text-brass-deep text-xs uppercase tracking-widest font-semibold hover:bg-parchment transition-colors"
                        >
                          Weiger
                        </button>
                      </div>
                    </div>
                  ) : expired ? (
                    <span className="text-xs uppercase tracking-widest text-brass-deep/40 font-semibold">
                      Verlopen
                    </span>
                  ) : submitted ? (
                    <span className="text-xs uppercase tracking-widest text-brass-gold font-semibold">
                      ✓ {a.actual_hours}u · €{Number(a.actual_cost).toFixed(2)}
                    </span>
                  ) : accepted ? (
                    <button
                      onClick={() => setOpenId(openId === a.id ? null : a.id)}
                      className="px-4 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
                    >
                      Uren invullen
                    </button>
                  ) : (
                    <span className="text-xs uppercase tracking-widest text-brass-deep/40 font-semibold">—</span>
                  )}
                </div>
              </div>

              {openId === a.id && (
                <form
                  onSubmit={(e) => submitHours(a.id, e)}
                  className="mt-6 pt-6 border-t border-brass-deep/10 grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div className="md:col-span-2 bg-parchment/60 border border-brass-deep/10 px-4 py-3 text-xs text-brass-deep/70 space-y-1">
                    <div>
                      <strong>Geplande boekingstijd:</strong>{" "}
                      {new Date(a.ride.scheduled_at).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                    <div>
                      <strong>Reistijd vanaf standplaats:</strong> {fmtHours(a.travel_to_pickup_min)} ·{" "}
                      <strong>terug:</strong> {fmtHours(a.travel_back_home_min)} (afgerond op kwartier)
                    </div>
                  </div>
                  {(() => {
                    const sched = new Date(a.ride.scheduled_at);
                    const pad = (n: number) => String(n).padStart(2, "0");
                    const defDate = `${sched.getFullYear()}-${pad(sched.getMonth() + 1)}-${pad(sched.getDate())}`;
                    const roundedMin = Math.round(sched.getMinutes() / 15) * 15;
                    const rh = roundedMin === 60 ? sched.getHours() + 1 : sched.getHours();
                    const rm = roundedMin === 60 ? 0 : roundedMin;
                    const defTime = `${pad(rh % 24)}:${pad(rm)}`;
                    return (
                      <>
                        <div className="md:col-span-2 text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                          Starttijd rit (op pickup)
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-brass-deep/45 font-semibold">Datum</label>
                          <input
                            name="ride_start_date"
                            type="date"
                            defaultValue={defDate}
                            required
                            className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-brass-deep/45 font-semibold">Tijd</label>
                          <select
                            name="ride_start_time"
                            defaultValue={defTime}
                            required
                            className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                          >
                            {QUARTER_TIMES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2 text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold mt-2">
                          Eindtijd rit (op dropoff)
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-brass-deep/45 font-semibold">Datum</label>
                          <input
                            name="ride_end_date"
                            type="date"
                            defaultValue={defDate}
                            required
                            className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-brass-deep/45 font-semibold">Tijd</label>
                          <select
                            name="ride_end_time"
                            defaultValue=""
                            required
                            className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                          >
                            <option value="" disabled>Kies tijd…</option>
                            {QUARTER_TIMES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    );
                  })()}
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                      Toelichting (optioneel)
                    </label>
                    <textarea
                      name="hours_notes"
                      rows={2}
                      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                    />
                  </div>
                  <p className="md:col-span-2 text-xs text-brass-deep/55">
                    Tarief {a.is_be_ride ? "België" : "Nederland"}: €{a.hourly_rate}/uur{a.is_be_ride ? " (grensoverschrijdend → BE-tarief op alle uren)" : ""} · Totale uren = reistijd heen + rit-uren + reistijd terug. Vertrek/terug standplaats worden automatisch berekend.{a.min_billable_hours > 0 ? ` · Minimum afrekening: ${a.min_billable_hours} uur.` : ""}
                  </p>
                  <button className="md:col-span-2 px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors">
                    Versturen
                  </button>
                </form>
              )}
            </li>
          );
        };

        const renderList = (list: typeof items) =>
          list.length === 0 ? (
            <p className="text-sm text-brass-deep/50 p-6">Geen ritten in deze categorie.</p>
          ) : (
            <ul className="space-y-px bg-brass-deep/10">{list.map(renderItem)}</ul>
          );

        return (
          <Tabs defaultValue="openstaand" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto md:inline-flex">
              <TabsTrigger value="openstaand">Openstaand ({buckets.openstaand.length})</TabsTrigger>
              <TabsTrigger value="geaccepteerd">Geaccepteerd ({buckets.geaccepteerd.length})</TabsTrigger>
              <TabsTrigger value="afgerond">Afgerond ({buckets.afgerond.length})</TabsTrigger>
              <TabsTrigger value="verlopen">Verlopen ({buckets.verlopen.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="openstaand" className="mt-6">{renderList(buckets.openstaand)}</TabsContent>
            <TabsContent value="geaccepteerd" className="mt-6">{renderList(buckets.geaccepteerd)}</TabsContent>
            <TabsContent value="afgerond" className="mt-6">{renderList(buckets.afgerond)}</TabsContent>
            <TabsContent value="verlopen" className="mt-6">{renderList(buckets.verlopen)}</TabsContent>
          </Tabs>
        );
      })()}
    </div>
  );
};

const DashboardInner = () => {
  const { role, loading } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-20 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <p className="text-sm text-brass-deep/50">Laden…</p>
          ) : role === "begeleider" ? (
            <EscortDashboard />
          ) : (
            <ClientDashboard />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Dashboard = () => (
  <RequireAuth>
    <DashboardInner />
  </RequireAuth>
);

export default Dashboard;
