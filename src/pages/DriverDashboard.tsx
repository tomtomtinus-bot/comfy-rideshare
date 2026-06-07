import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Ride {
  id: string;
  pickup_address: string;
  pickup_city: string;
  dropoff_address: string;
  dropoff_city: string;
  scheduled_at: string;
  notes: string | null;
}

interface DriverAssignment {
  id: string;
  ride_id: string;
  status: string;
  travel_to_pickup_min: number;
  travel_back_home_min: number;
  hours_submitted_at: string | null;
  hours_approved_at: string | null;
  actual_hours: number | null;
  hours_notes: string | null;
  departed_base_at: string | null;
  returned_base_at: string | null;
  ride: Ride;
}

const fmtDT = (d: string) =>
  new Date(d).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });

/**
 * Dashboard voor chauffeurs binnen een bedrijfsaccount.
 * - Toont alleen ritten die de planner aan hen heeft toegewezen.
 * - Geen financiele details (uurtarief, kosten, facturen).
 * - Chauffeur vult enkel begin-/eindtijd standplaats + opmerkingen in. Goedkeuring door planner.
 */
export const DriverDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<DriverAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: a } = await supabase
      .from("ride_assignments")
      .select("id, ride_id, status, travel_to_pickup_min, travel_back_home_min, hours_submitted_at, hours_approved_at, actual_hours, hours_notes, departed_base_at, returned_base_at")
      .eq("assigned_driver_id", user.id)
      .order("invited_at", { ascending: false });
    const list = (a ?? []) as any[];
    if (!list.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    const rideIds = list.map((x) => x.ride_id);
    const { data: rides } = await supabase
      .from("rides")
      .select("id, pickup_address, pickup_city, dropoff_address, dropoff_city, scheduled_at, notes")
      .in("id", rideIds);
    const rideMap = new Map((rides ?? []).map((r: any) => [r.id, r]));
    const merged = list
      .map((x) => ({ ...x, ride: rideMap.get(x.ride_id) }))
      .filter((x) => x.ride)
      .sort((a, b) => +new Date(a.ride.scheduled_at) - +new Date(b.ride.scheduled_at));
    setItems(merged as DriverAssignment[]);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user?.id]);

  const submitHours = async (a: DriverAssignment, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const startD = fd.get("start_date") as string;
    const startT = fd.get("start_time") as string;
    const endD = fd.get("end_date") as string;
    const endT = fd.get("end_time") as string;
    const notes = (fd.get("notes") as string)?.trim() || null;
    if (!startD || !startT || !endD || !endT) return toast.error("Vul alle tijden in");
    const start = new Date(`${startD}T${startT}`);
    const end = new Date(`${endD}T${endT}`);
    if (isNaN(+start) || isNaN(+end) || end <= start) return toast.error("Eindtijd moet na starttijd liggen");
    const hours = +((+end - +start) / 3600000).toFixed(2);
    const { error } = await supabase
      .from("ride_assignments")
      .update({
        departed_base_at: start.toISOString(),
        returned_base_at: end.toISOString(),
        actual_hours: hours,
        hours_notes: notes,
        hours_submitted_at: new Date().toISOString(),
      })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Uren ingediend — wacht op goedkeuring planner");
    setOpenId(null);
    await load();
  };

  const grouped = {
    aankomend: items.filter((a) => !a.hours_submitted_at && new Date(a.ride.scheduled_at).getTime() > Date.now() - 24 * 3600 * 1000),
    uren_invullen: items.filter((a) => !a.hours_submitted_at && new Date(a.ride.scheduled_at).getTime() <= Date.now() - 24 * 3600 * 1000),
    wacht_goedkeuring: items.filter((a) => a.hours_submitted_at && !a.hours_approved_at),
    afgerond: items.filter((a) => a.hours_approved_at),
  };

  const Card = ({ a, action }: { a: DriverAssignment; action?: React.ReactNode }) => (
    <li className="bg-card p-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => navigate(`/opdracht/${a.ride.id}`)}
        className="flex-1 min-w-0 text-left"
      >
        <p className="text-sm font-medium tabular-nums">{fmtDT(a.ride.scheduled_at)}</p>
        <p className="font-medium truncate mt-1">
          {a.ride.pickup_city} <span className="text-brass-gold mx-1">→</span> {a.ride.dropoff_city}
        </p>
      </button>
      {action}
    </li>
  );

  return (
    <div className="space-y-10">
      <header>
        <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">Chauffeur</p>
        <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">Mijn ritten</h1>
        <p className="text-sm text-brass-deep/80 mt-3 max-w-xl">
          Hier zie je de ritten die je planner aan jou heeft toegewezen. Na de rit vul je je tijden in;
          de planner keurt ze goed en regelt de facturatie.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-brass-deep/80">Laden…</p>
      ) : items.length === 0 ? (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/80">Nog geen ritten toegewezen door je planner.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-card/60 border border-brass-deep/10 p-4">
            <h2 className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/70 mb-3">
              Aankomende ritten ({grouped.aankomend.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {grouped.aankomend.length === 0 ? (
                <p className="text-xs text-brass-deep/80 italic">Geen aankomende ritten.</p>
              ) : (
                grouped.aankomend.map((a) => <Card key={a.id} a={a} />)
              )}
            </ul>
          </section>

          <section className="bg-card/60 border border-brass-deep/10 p-4">
            <h2 className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/70 mb-3">
              Uren invullen ({grouped.uren_invullen.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {grouped.uren_invullen.length === 0 ? (
                <p className="text-xs text-brass-deep/80 italic">Geen uren in te vullen.</p>
              ) : (
                grouped.uren_invullen.map((a) => (
                  <Card
                    key={a.id}
                    a={a}
                    action={
                      <button
                        onClick={() => setOpenId(a.id)}
                        className="px-3 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
                      >
                        Uren invullen
                      </button>
                    }
                  />
                ))
              )}
            </ul>
          </section>

          <section className="bg-card/60 border border-brass-deep/10 p-4">
            <h2 className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/70 mb-3">
              Wacht op goedkeuring ({grouped.wacht_goedkeuring.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {grouped.wacht_goedkeuring.length === 0 ? (
                <p className="text-xs text-brass-deep/80 italic">Niets in afwachting.</p>
              ) : (
                grouped.wacht_goedkeuring.map((a) => (
                  <Card
                    key={a.id}
                    a={a}
                    action={
                      <span className="text-[10px] uppercase tracking-widest text-amber-700 font-bold">
                        ⏳ Bij planner
                      </span>
                    }
                  />
                ))
              )}
            </ul>
          </section>

          <section className="bg-card/60 border border-brass-deep/10 p-4">
            <h2 className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/70 mb-3">
              Afgerond ({grouped.afgerond.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {grouped.afgerond.length === 0 ? (
                <p className="text-xs text-brass-deep/80 italic">Nog niets afgerond.</p>
              ) : (
                grouped.afgerond.map((a) => (
                  <Card
                    key={a.id}
                    a={a}
                    action={
                      <span className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold tabular-nums">
                        ✓ {a.actual_hours}u
                      </span>
                    }
                  />
                ))
              )}
            </ul>
          </section>
        </div>
      )}

      {items.map((a) => (
        <Dialog key={a.id} open={openId === a.id} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
          <DialogContent className="max-w-lg w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display italic text-2xl text-brass-deep">Vul je uren in</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => submitHours(a, e)} className="space-y-4 pt-2">
              <p className="text-xs text-brass-deep/80">
                Vul de tijden in waarop je vertrok van je standplaats en terugkeerde. Je planner controleert en keurt ze goed.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">Vertrek datum</label>
                  <input name="start_date" type="date" required className="mt-1 w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">Vertrektijd</label>
                  <input name="start_time" type="time" step={900} required className="mt-1 w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">Terug datum</label>
                  <input name="end_date" type="date" required className="mt-1 w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">Terug tijd</label>
                  <input name="end_time" type="time" step={900} required className="mt-1 w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">Opmerkingen</label>
                <textarea name="notes" rows={2} className="mt-1 w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
              </div>
              <button className="w-full px-5 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors">
                Indienen ter goedkeuring
              </button>
            </form>
          </DialogContent>
        </Dialog>
      ))}

      <p className="text-xs text-brass-deep/80 text-center">
        <Link to="/dashboard" className="hover:underline">Vragen? Neem contact op met je planner.</Link>
      </p>
    </div>
  );
};

export default DriverDashboard;
