import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { MiniMap } from "@/components/site/MiniMap";
import { openPermitPdf } from "@/lib/openPermitPdf";
import { AssignmentChat } from "@/components/site/AssignmentChat";
import { toast } from "sonner";

interface RideDetail {
  ride: {
    id: string;
    pickup_address: string;
    pickup_city: string;
    pickup_lat?: number | null;
    pickup_lng?: number | null;
    dropoff_address: string;
    dropoff_city: string;
    dropoff_lat?: number | null;
    dropoff_lng?: number | null;
    scheduled_at: string;
    status?: string;
    notes: string | null;
    cargo_length_m: number | null;
    cargo_width_m: number | null;
    cargo_height_m: number | null;
    cargo_weight_t: number | null;
    permit_number: string | null;
    permit_id: string | null;
    client_reference: string | null;
    num_escorts: number;
    drivers: { name: string; phone: string }[] | null;
    license_plates: string[] | null;
  };
  escorts: Array<{
    assignment_id: string;
    escort_id: string;
    status: string;
    anonymous_id: string | null;
    full_name: string | null;
    phone: string | null;
    base_city: string | null;
    vehicle_type: string | null;
  }>;
  permit: {
    id: string;
    permit_number: string;
    valid_from: string | null;
    valid_to: string | null;
    pdf_path: string | null;
    max_length_m: number | null;
    max_width_m: number | null;
    max_height_m: number | null;
    max_weight_kg: number | null;
  } | null;
}

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" });

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-card shadow-etched p-6 md:p-8">
    <h2 className="font-display text-xl text-brass-deep italic mb-4">{title}</h2>
    {children}
  </section>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{label}</p>
    <p className="text-sm font-medium">{value || <span className="text-brass-deep/40">—</span>}</p>
  </div>
);

const TelLink = ({ phone }: { phone: string | null | undefined }) =>
  phone ? (
    <a href={`tel:${phone}`} className="text-brass-gold hover:underline font-medium">
      {phone}
    </a>
  ) : (
    <span className="text-brass-deep/40">—</span>
  );

const statusLabel: Record<string, string> = {
  invited: "uitgenodigd",
  accepted: "geaccepteerd",
  declined: "geweigerd",
  expired: "verlopen",
  cancelled: "geannuleerd",
};

const Inner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<RideDetail | null>(null);
  const [permitUrl, setPermitUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelReqs, setCancelReqs] = useState<Record<string, { status: string; reason: string | null }>>({});
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: res, error } = await supabase.rpc("get_ride_details_for_client", { _ride_id: id });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const detail = res as unknown as RideDetail;
    setData(detail);
    if (detail?.permit?.pdf_path) {
      const { data: signed } = await supabase.storage
        .from("permits")
        .createSignedUrl(detail.permit.pdf_path, 3600);
      if (signed?.signedUrl) setPermitUrl(signed.signedUrl);
    }
    // Fetch cancel-request status per assignment
    const { data: ras } = await supabase
      .from("ride_assignments")
      .select("id, cancel_request_status, cancel_request_reason")
      .eq("ride_id", id);
    const map: Record<string, { status: string; reason: string | null }> = {};
    (ras ?? []).forEach((r: any) => {
      map[r.id] = { status: r.cancel_request_status ?? "none", reason: r.cancel_request_reason ?? null };
    });
    setCancelReqs(map);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCancelRide = async () => {
    if (!data) return;
    const hours = (new Date(data.ride.scheduled_at).getTime() - Date.now()) / 3600000;
    const late = hours < 4;
    const msg = late
      ? "Let op: deze rit start binnen 4 uur. Per geaccepteerde begeleider wordt het minimumtarief (minimum aantal factureerbare uren × uurtarief) in rekening gebracht. Doorgaan?"
      : "Weet je zeker dat je deze rit wilt annuleren? Er worden geen kosten in rekening gebracht.";
    if (!confirm(msg)) return;
    setBusy(true);
    const { data: res, error } = await supabase.rpc("client_cancel_ride", { _ride_id: data.ride.id, _reason: null });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const r = res as any;
    if (r?.charged_escorts > 0) {
      toast.success(`Rit geannuleerd. Minimumtarief berekend voor ${r.charged_escorts} begeleider(s): € ${Number(r.total_fee).toFixed(2)}.`);
    } else {
      toast.success("Rit geannuleerd. Geen kosten.");
    }
    navigate("/dashboard");
  };

  const handleDecide = async (assignmentId: string, approve: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("client_decide_cancellation", { _assignment_id: assignmentId, _approve: approve });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Annulering goedgekeurd." : "Verzoek afgewezen.");
    load();
  };

  if (loading) return <p className="text-sm text-brass-deep/50">Laden…</p>;
  if (error || !data) {
    return (
      <div className="bg-card shadow-etched p-12 text-center">
        <p className="text-brass-deep/60 mb-4">Geen toegang tot deze ritdetails.</p>
        <Link to="/dashboard" className="text-brass-gold uppercase tracking-widest text-xs font-semibold">
          ← Terug naar dashboard
        </Link>
      </div>
    );
  }

  const { ride, escorts, permit } = data;
  const drivers = ride.drivers ?? [];
  const plates = ride.license_plates ?? [];

  return (
    <div className="space-y-8">
      <header>
        <Link to="/dashboard" className="text-brass-deep/60 hover:text-brass-deep uppercase tracking-widest text-xs font-semibold">
          ← Terug naar mijn ritten
        </Link>
        <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mt-6 mb-3">Ritdetails</p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-display text-3xl md:text-4xl text-brass-deep italic">
            {ride.pickup_city} <span className="text-brass-gold">→</span> {ride.dropoff_city}
          </h1>
          {ride.status !== "cancelled" && (
            <Link
              to={`/rit/${ride.id}/bewerk`}
              className="px-4 py-2 border border-brass-deep/30 uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-deep hover:text-parchment transition-colors"
            >
              Bewerken
            </Link>
          )}
        </div>
        <p className="text-brass-deep/60 mt-2">{fmtDateTime(ride.scheduled_at)}</p>
      </header>

      <Section title="Rit">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Vertrek" value={`${ride.pickup_address}, ${ride.pickup_city}`} />
          <Field label="Bestemming" value={`${ride.dropoff_address}, ${ride.dropoff_city}`} />
          <Field label="Geplande tijd" value={fmtDateTime(ride.scheduled_at)} />
          <Field label="Aantal begeleiders" value={ride.num_escorts} />
          <Field label="Eigen referentie" value={ride.client_reference ?? "—"} />
          <Field label="Vergunningnummer" value={ride.permit_number ?? "—"} />
          {(ride.cargo_length_m || ride.cargo_weight_t) && (
            <div className="md:col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Lading</p>
              <p className="text-sm font-medium tabular-nums">
                {ride.cargo_length_m ?? "—"}m × {ride.cargo_width_m ?? "—"}m × {ride.cargo_height_m ?? "—"}m ·{" "}
                {ride.cargo_weight_t ?? "—"}t
              </p>
            </div>
          )}
          {ride.notes && (
            <div className="md:col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Opmerkingen</p>
              <p className="text-sm">{ride.notes}</p>
            </div>
          )}
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <MiniMap label="Vertrek" address={`${ride.pickup_address}, ${ride.pickup_city}`} lat={ride.pickup_lat} lng={ride.pickup_lng} />
          <MiniMap label="Bestemming" address={`${ride.dropoff_address}, ${ride.dropoff_city}`} lat={ride.dropoff_lat} lng={ride.dropoff_lng} />
        </div>
      </Section>

      <Section title={`Chauffeurs (${drivers.length})`}>
        {drivers.length === 0 ? (
          <p className="text-sm text-brass-deep/50">Geen chauffeurs opgegeven.</p>
        ) : (
          <ul className="divide-y divide-brass-deep/10">
            {drivers.map((d, i) => (
              <li key={i} className="py-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <p className="font-medium">{d.name || <span className="text-brass-deep/40">—</span>}</p>
                <TelLink phone={d.phone} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Kentekens (${plates.length})`}>
        {plates.length === 0 ? (
          <p className="text-sm text-brass-deep/50">Geen kentekens opgegeven.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {plates.map((p, i) => (
              <li key={i} className="px-3 py-1.5 bg-brass-gold/15 border border-brass-gold/40 text-sm font-mono tabular-nums tracking-wider">
                {p}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Begeleiders (${escorts.length})`}>
        {escorts.length === 0 ? (
          <p className="text-sm text-brass-deep/50">Nog geen begeleiders toegewezen.</p>
        ) : (
          <ul className="divide-y divide-brass-deep/10">
            {escorts.map((e) => {
              const cr = cancelReqs[e.assignment_id];
              return (
              <li key={e.assignment_id} className="py-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                  <div>
                    <p className="font-medium text-brass-deep">#{e.anonymous_id ?? "—"}</p>
                    <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">
                      {statusLabel[e.status] ?? e.status}
                    </p>
                  </div>
                  <div className="text-sm">
                    {e.status === "accepted" ? (
                      <>
                        <p className="font-medium">{e.full_name ?? "—"}</p>
                        <p className="text-xs text-brass-deep/55">{e.base_city ?? ""}</p>
                      </>
                    ) : (
                      <p className="text-brass-deep/40 text-xs italic">Nog niet bevestigd</p>
                    )}
                  </div>
                  <div className="text-sm">
                    <TelLink phone={e.phone} />
                  </div>
                  <div className="text-xs text-brass-deep/55">{e.vehicle_type ?? ""}</div>
                </div>
                {cr?.status === "pending" && (
                  <div className="bg-brass-gold/10 border border-brass-gold/40 p-3 space-y-2">
                    <p className="text-xs uppercase tracking-widest font-bold text-brass-deep">Annuleringsverzoek</p>
                    {cr.reason && <p className="text-sm text-brass-deep/80 italic">"{cr.reason}"</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDecide(e.assignment_id, true)}
                        className="px-4 py-2 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50"
                      >
                        Goedkeuren
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDecide(e.assignment_id, false)}
                        className="px-4 py-2 border border-brass-deep/30 uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-deep/5 disabled:opacity-50"
                      >
                        Afwijzen
                      </button>
                    </div>
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        )}
      </Section>

      {ride.status !== "cancelled" && ride.status !== "completed" && (
        <Section title="Annulering">
          <p className="text-sm text-brass-deep/70 mb-3">
            Annulering binnen 4 uur voor aanvang: minimumtarief per geaccepteerde begeleider (minimum aantal factureerbare uren × hun uurtarief).
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={handleCancelRide}
            className="px-6 py-3 bg-red-700 text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-red-800 transition-colors disabled:opacity-50"
          >
            Rit annuleren
          </button>
        </Section>
      )}

      {ride.status === "cancelled" && (
        <div className="bg-red-50 border border-red-200 p-5 text-sm text-red-900">
          Deze rit is geannuleerd.
        </div>
      )}

      <Section title="Ontheffing">
        {permit ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Vergunningnummer" value={permit.permit_number} />
              <Field label="Geldig van" value={permit.valid_from ?? "—"} />
              <Field label="Geldig tot" value={permit.valid_to ?? "—"} />
              <div className="md:col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Maximale afmetingen</p>
                <p className="text-sm font-medium tabular-nums">
                  {permit.max_length_m ?? "—"}m × {permit.max_width_m ?? "—"}m × {permit.max_height_m ?? "—"}m ·{" "}
                  {permit.max_weight_kg ? `${permit.max_weight_kg} kg` : "—"}
                </p>
              </div>
            </div>
            {permit.pdf_path && (
              <button
                type="button"
                onClick={() => openPermitPdf(permit.pdf_path!).catch((e) => toast.error(`Kan PDF niet openen: ${e?.message ?? e}`))}
                className="inline-block px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
              >
                PDF openen
              </button>
            )}
          </div>
        ) : ride.permit_number ? (
          <p className="text-sm text-brass-deep/60">Vergunning {ride.permit_number} (geen document beschikbaar)</p>
        ) : (
          <p className="text-sm text-brass-deep/50">Geen ontheffing gekoppeld.</p>
        )}
      </Section>
    </div>
  );
};

const ClientRideDetail = () => (
  <RequireAuth>
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-12 md:py-16 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-5xl mx-auto">
          <Inner />
        </div>
      </main>
      <Footer />
    </div>
  </RequireAuth>
);

export default ClientRideDetail;
