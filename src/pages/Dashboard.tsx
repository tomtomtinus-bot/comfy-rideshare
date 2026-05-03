import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";

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

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            Opdrachtgever
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">Mijn ritten</h1>
        </div>
        <Link
          to="/aanvragen"
          className="px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
        >
          Nieuwe rit aanvragen
        </Link>
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
    })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

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
    const { data: me } = await supabase
      .from("escort_profiles")
      .select("hourly_rate")
      .eq("id", user.id)
      .maybeSingle();

    const rideMap = new Map((rides ?? []).map((r) => [r.id, r]));
    const merged = list
      .map((x) => ({ ...x, ride: rideMap.get(x.ride_id) as RideRow, hourly_rate: Number(me?.hourly_rate ?? 0) }))
      .filter((x) => x.ride)
      .sort((a, b) => new Date(b.ride.scheduled_at).getTime() - new Date(a.ride.scheduled_at).getTime());

    setItems(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
      <header>
        <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
          Begeleider
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">Mijn opdrachten</h1>
      </header>

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
            return (
              <li key={a.id} className="bg-card p-6 md:p-8">
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-12 md:col-span-3">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Datum</p>
                    <p className="font-medium tabular-nums">{fmtDate(a.ride.scheduled_at)}</p>
                  </div>
                  <div className="col-span-12 md:col-span-5">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Route</p>
                    <p className="font-medium">
                      {a.ride.pickup_city} <span className="text-brass-gold mx-2">→</span> {a.ride.dropoff_city}
                    </p>
                    <p className="text-sm text-brass-deep/55 mt-2">
                      Reistijd vanaf basis: {a.travel_to_pickup_min} min · Terug: {a.travel_back_home_min} min
                    </p>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Schatting</p>
                    <p className="font-semibold tabular-nums">
                      {a.estimated_hours}u · €{Number(a.estimated_cost).toFixed(2)}
                    </p>
                  </div>
                  <div className="col-span-6 md:col-span-2 text-right">
                    {submitted ? (
                      <span className="text-xs uppercase tracking-widest text-brass-gold font-semibold">
                        ✓ {a.actual_hours}u · €{Number(a.actual_cost).toFixed(2)}
                      </span>
                    ) : (
                      <button
                        onClick={() => setOpenId(openId === a.id ? null : a.id)}
                        className="px-4 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
                      >
                        Uren invullen
                      </button>
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
