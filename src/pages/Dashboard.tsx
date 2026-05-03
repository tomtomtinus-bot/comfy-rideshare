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

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: rs } = await supabase
        .from("rides")
        .select("*")
        .eq("client_id", user.id)
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
      }
      setLoading(false);
    })();
  }, [user]);

  const exportXlsx = () => {
    if (rides.length === 0) return toast.error("Geen ritten om te exporteren");
    const rows = rides.map((r) => {
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
    XLSX.writeFile(wb, `rittenadministratie-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel-bestand gedownload");
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
            onClick={exportXlsx}
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

      {loading ? (
        <p className="text-sm text-brass-deep/50">Laden…</p>
      ) : rides.length === 0 ? (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/60 mb-6">U heeft nog geen ritten aangevraagd.</p>
          <Link to="/aanvragen" className="text-brass-gold uppercase tracking-widest text-xs font-semibold">
            Vraag uw eerste rit aan →
          </Link>
        </div>
      ) : (
        <ul className="space-y-px bg-brass-deep/10">
          {rides.map((r) => {
            const ass = assignments[r.id] ?? [];
            const totalEst = ass.reduce((s, a) => s + Number(a.estimated_cost ?? 0), 0);
            const totalActual = ass.reduce((s, a) => s + Number(a.actual_cost ?? 0), 0);
            const allSubmitted = ass.length > 0 && ass.every((a) => a.hours_submitted_at);
            return (
              <li key={r.id} className="bg-card p-6 md:p-8">
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-12 md:col-span-3">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">
                      Datum
                    </p>
                    <p className="font-medium tabular-nums">{fmtDate(r.scheduled_at)}</p>
                    <div className="mt-3"><StatusBadge status={r.status} /></div>
                  </div>
                  <div className="col-span-12 md:col-span-5">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">
                      Route
                    </p>
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
                        {r.escort_type_required ? ` · ${r.escort_type_required}` : ""}
                      </p>
                    )}
                    {r.notes && <p className="text-sm text-brass-deep/55 mt-2">{r.notes}</p>}
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">
                      Schatting
                    </p>
                    <p className="font-semibold tabular-nums">€{totalEst.toFixed(2)}</p>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">
                      Werkelijk
                    </p>
                    <p className="font-semibold tabular-nums text-brass-gold">
                      {allSubmitted ? `€${(totalActual + Number(r.app_fee ?? 0)).toFixed(2)}` : "—"}
                    </p>
                    <p className="text-[10px] text-brass-deep/50 mt-1">incl. €{Number(r.app_fee ?? 0).toFixed(2)} fee</p>
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
                          <span className="ml-2 text-[10px] uppercase tracking-widest text-brass-gold font-bold">
                            {statusLabel[a.status] ?? a.status}
                          </span>
                        </span>
                        <span className="text-brass-deep/60 tabular-nums">
                          {a.actual_hours
                            ? `${a.actual_hours}u · €${Number(a.actual_cost).toFixed(2)}`
                            : `~${a.estimated_hours}u (gepland)`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const hoursSchema = z.object({
  departed_base_at: z.string().min(1, "Vertrektijd vereist"),
  returned_base_at: z.string().min(1, "Eindtijd vereist"),
  hours_notes: z.string().trim().max(500).optional(),
});

const EscortDashboard = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<
    (AssignmentRow & {
      ride: RideRow;
      hourly_rate: number;
      client_anon: string;
    })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

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
      .eq("escort_id", user.id);
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
      .select("hourly_rate")
      .eq("id", user.id)
      .maybeSingle();

    const rideMap = new Map((rides ?? []).map((r) => [r.id, r]));
    const merged = list
      .map((x) => {
        const ride = rideMap.get(x.ride_id) as RideRow | undefined;
        return {
          ...x,
          ride: ride as RideRow,
          hourly_rate: Number(me?.hourly_rate ?? 0),
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
              body: "U heeft 30 minuten om te accepteren.",
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
    toast.success(accept ? "Rit geaccepteerd" : "Rit geweigerd");
    load();
  };
  void tick;

  const submitHours = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = hoursSchema.safeParse({
      departed_base_at: fd.get("departed_base_at"),
      returned_base_at: fd.get("returned_base_at"),
      hours_notes: fd.get("hours_notes"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    const start = new Date(parsed.data.departed_base_at);
    const end = new Date(parsed.data.returned_base_at);
    if (end <= start) return toast.error("Eindtijd moet na starttijd liggen");

    const item = items.find((i) => i.id === id);
    if (!item) return;

    const hours = +((end.getTime() - start.getTime()) / 1000 / 3600).toFixed(2);
    const cost = +(hours * item.hourly_rate).toFixed(2);

    const { error } = await supabase
      .from("ride_assignments")
      .update({
        departed_base_at: start.toISOString(),
        returned_base_at: end.toISOString(),
        actual_hours: hours,
        actual_cost: cost,
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
      ) : (
        <ul className="space-y-px bg-brass-deep/10">
          {items.map((a) => {
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
                    <p className="text-xs text-brass-deep/55 mt-1">Opdrachtgever #{a.client_anon}</p>
                    <div className="mt-2"><StatusBadge status={a.status} /></div>
                  </div>
                  <div className="col-span-12 md:col-span-5">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Route</p>
                    <p className="font-medium">
                      {a.ride.pickup_city} <span className="text-brass-gold mx-2">→</span> {a.ride.dropoff_city}
                    </p>
                    <p className="text-sm text-brass-deep/55 mt-2">
                      Reistijd vanaf basis: {a.travel_to_pickup_min} min · Terug: {a.travel_back_home_min} min
                    </p>
                    {(a.ride.cargo_length_m || a.ride.cargo_weight_t) && (
                      <p className="text-xs text-brass-deep/60 mt-1 tabular-nums">
                        Lading: {a.ride.cargo_length_m}m × {a.ride.cargo_width_m}m × {a.ride.cargo_height_m}m · {a.ride.cargo_weight_t}t
                        {a.ride.permit_number ? ` · ${a.ride.permit_number}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Schatting</p>
                    <p className="font-semibold tabular-nums">
                      {a.estimated_hours}u · €{Number(a.estimated_cost).toFixed(2)}
                    </p>
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
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                        Vertrek standplaats
                      </label>
                      <input
                        name="departed_base_at"
                        type="datetime-local"
                        required
                        className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                        Terug op standplaats
                      </label>
                      <input
                        name="returned_base_at"
                        type="datetime-local"
                        required
                        className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                      />
                    </div>
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
                      Tarief: €{a.hourly_rate}/uur · Berekend over volledige tijd vanaf vertrek standplaats tot terugkeer.
                    </p>
                    <button className="md:col-span-2 px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors">
                      Versturen
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
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
