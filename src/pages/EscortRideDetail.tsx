import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { MiniMap } from "@/components/site/MiniMap";
import { MapsLink } from "@/components/site/MapsLink";
import { openPermitPdf } from "@/lib/openPermitPdf";
import { AssignmentChat } from "@/components/site/AssignmentChat";
import { SwapPendingBanner } from "@/components/site/SwapPendingBanner";
import { ExtraLegsList } from "@/components/site/ExtraLegsList";
import { toast } from "sonner";

interface RideDetail {
  ride: {
    id: string;
    status?: string;
    pickup_address: string;
    pickup_city: string;
    pickup_lat?: number | null;
    pickup_lng?: number | null;
    dropoff_address: string;
    dropoff_city: string;
    dropoff_lat?: number | null;
    dropoff_lng?: number | null;
    scheduled_at: string;
    notes: string | null;
    cargo_length_m: number | null;
    cargo_width_m: number | null;
    cargo_height_m: number | null;
    cargo_weight_t: number | null;
    permit_number: string | null;
    permit_id: string | null;
    client_reference: string | null;
    escort_type_required: string | null;
    num_escorts: number;
    drivers: { name: string; phone: string }[] | null;
    license_plates: string[] | null;
    bundle_id?: string | null;
    bundle_label?: string | null;
  };
  client: {
    full_name: string | null;
    company_name: string | null;
    phone: string | null;
    billing_email: string | null;
    billing_contact_name: string | null;
    anonymous_id: string | null;
  } | null;
  escorts: Array<{
    assignment_id: string;
    escort_id: string;
    status: string;
    is_self: boolean;
    anonymous_id: string | null;
    full_name: string | null;
    phone: string | null;
    base_city: string | null;
    vehicle_type: string | null;
  }>;
  permit: {
    id: string;
    permit_number: string;
    reference: string | null;
    cargo: string | null;
    valid_from: string | null;
    valid_to: string | null;
    pdf_path: string | null;
    max_length_m: number | null;
    max_width_m: number | null;
    max_height_m: number | null;
    max_weight_kg: number | null;
  } | null;
  viewer_status?: string;
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

const Inner = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RideDetail | null>(null);
  const [permitUrl, setPermitUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myAssignment, setMyAssignment] = useState<{
    id: string;
    cancel_request_status: string;
    cancel_request_reason: string | null;
    bundle_priority_offer: boolean;
    responds_by: string;
    status: string;
    actual_hours: number | null;
    actual_cost: number | null;
    extra_costs: { description: string; amount: number }[] | null;
    extra_costs_total: number;
    hours_notes: string | null;
    departed_base_at: string | null;
    returned_base_at: string | null;
    hours_submitted_at: string | null;
    hours_dispute_status: string | null;
    hours_dispute_reason: string | null;
    hours_disputed_at: string | null;
    estimated_hours: number | null;
    estimated_cost: number | null;
  } | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [bundleSiblings, setBundleSiblings] = useState<Array<{
    ride_id: string;
    assignment_id: string;
    assignment_status: string;
    pickup_city: string;
    dropoff_city: string;
    scheduled_at: string;
    interest_expressed_at: string | null;
    broadcast_closes_at: string | null;
  }>>([]);
  const [bundleBusy, setBundleBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: res, error } = await supabase.rpc("get_ride_details_for_escort", { _ride_id: id });
    if (error) { setError(error.message); setLoading(false); return; }
    const detail = res as unknown as RideDetail;
    setData(detail);

    if (detail?.ride?.bundle_id) {
      const { data: sibs } = await supabase.rpc("get_bundle_rides_for_escort", {
        _bundle_id: detail.ride.bundle_id,
      });
      setBundleSiblings(((sibs as any[]) ?? []).filter((s) => s.ride_id !== detail.ride.id));
    } else {
      setBundleSiblings([]);
    }

    if (detail?.permit?.pdf_path) {
      const { data: signed } = await supabase.storage
        .from("permits")
        .createSignedUrl(detail.permit.pdf_path, 3600);
      if (signed?.signedUrl) setPermitUrl(signed.signedUrl);
    }

    const { data: u } = await supabase.auth.getUser();
    if (u?.user) {
      setUserId(u.user.id);
      const { data: ra } = await supabase
        .from("ride_assignments")
        .select(`
          id, cancel_request_status, cancel_request_reason, bundle_priority_offer, responds_by, status,
          actual_hours, actual_cost, extra_costs, extra_costs_total, hours_notes,
          departed_base_at, returned_base_at, hours_submitted_at,
          hours_dispute_status, hours_dispute_reason, hours_disputed_at,
          estimated_hours, estimated_cost
        `)
        .eq("ride_id", id)
        .eq("escort_id", u.user.id)
        .maybeSingle();
      if (ra) setMyAssignment({
        id: ra.id,
        cancel_request_status: (ra as any).cancel_request_status ?? "none",
        cancel_request_reason: (ra as any).cancel_request_reason ?? null,
        bundle_priority_offer: (ra as any).bundle_priority_offer ?? false,
        responds_by: (ra as any).responds_by,
        status: (ra as any).status,
        actual_hours: (ra as any).actual_hours ?? null,
        actual_cost: (ra as any).actual_cost ?? null,
        extra_costs: (ra as any).extra_costs ?? null,
        extra_costs_total: (ra as any).extra_costs_total ?? 0,
        hours_notes: (ra as any).hours_notes ?? null,
        departed_base_at: (ra as any).departed_base_at ?? null,
        returned_base_at: (ra as any).returned_base_at ?? null,
        hours_submitted_at: (ra as any).hours_submitted_at ?? null,
        hours_dispute_status: (ra as any).hours_dispute_status ?? null,
        hours_dispute_reason: (ra as any).hours_dispute_reason ?? null,
        hours_disputed_at: (ra as any).hours_disputed_at ?? null,
        estimated_hours: (ra as any).estimated_hours ?? null,
        estimated_cost: (ra as any).estimated_cost ?? null,
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const submitCancelRequest = async () => {
    if (!myAssignment) return;
    if (cancelReason.trim().length < 3) { toast.error("Geef een korte reden op."); return; }
    setBusy(true);
    const { error } = await supabase.rpc("escort_request_cancellation", {
      _assignment_id: myAssignment.id,
      _reason: cancelReason.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Verzoek verstuurd naar opdrachtgever.");
    setShowCancelForm(false);
    setCancelReason("");
    load();
  };

  if (loading) {
    return <p className="text-sm text-brass-deep/50">Laden…</p>;
  }
  if (error || !data) {
    return (
      <div className="bg-card shadow-etched p-12 text-center">
        <p className="text-brass-deep/60 mb-4">
          Geen toegang tot deze ritdetails. Alleen geaccepteerde ritten zijn zichtbaar.
        </p>
        <p className="text-xs text-brass-deep/50 mb-4">
          Ondersteuning nodig?{" "}
          <a href="mailto:support@viacust.com" className="text-brass-gold hover:text-brass-deep underline">
            support@viacust.com
          </a>
        </p>
        <Link to="/dashboard" className="text-brass-gold uppercase tracking-widest text-xs font-semibold">
          ← Terug naar dashboard
        </Link>
      </div>
    );
  }

  const { ride, client, escorts, permit, viewer_status } = data;
  const isInvited = viewer_status === "invited";
  const isCompleted = ride.status === "completed";
  const others = escorts.filter((e) => !e.is_self);

  return (
    <div className="space-y-8">
      <header>
        <Link
          to="/dashboard"
          className="text-brass-deep/60 hover:text-brass-deep uppercase tracking-widest text-xs font-semibold"
        >
          ← Terug naar mijn opdrachten
        </Link>
        <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mt-6 mb-3">
          Opdrachtdetails
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-brass-deep italic">
          {ride.pickup_city} <span className="text-brass-gold">→</span> {ride.dropoff_city}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-brass-deep/60">{fmtDateTime(ride.scheduled_at)}</p>
          {isCompleted && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-widest font-bold border border-emerald-300">
              Afgerond
            </span>
          )}
        </div>
      </header>

      {userId && (
        <SwapPendingBanner rideId={ride.id} currentUserId={userId} onChanged={load} />
      )}

      {ride.bundle_id && ride.bundle_label && (() => {
        const isPriority = !!myAssignment?.bundle_priority_offer && myAssignment.status === "invited";
        const expired = myAssignment?.responds_by ? new Date(myAssignment.responds_by).getTime() < Date.now() : false;
        const acceptOffer = async () => {
          if (!myAssignment) return;
          setBundleBusy(true);
          const { error } = await supabase.rpc("accept_bundle_priority_offer", { _assignment_id: myAssignment.id });
          setBundleBusy(false);
          if (error) return toast.error(error.message);
          toast.success("Vervolgrit geaccepteerd.");
          load();
        };
        const declineOffer = async () => {
          if (!myAssignment) return;
          setBundleBusy(true);
          const { error } = await supabase.rpc("decline_bundle_priority_offer", {
            _assignment_id: myAssignment.id,
            _reason: declineReason.trim() || null,
          });
          setBundleBusy(false);
          if (error) return toast.error(error.message);
          toast.success("Geweigerd. Uw andere ritten in dit pakket blijven staan.");
          setShowDeclineForm(false);
          setDeclineReason("");
          load();
        };
        return (
          <section className="bg-brass-gold/10 border-l-4 border-brass-gold p-5 md:p-6">
            <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-1">
              📦 {isPriority ? "Vervolgrit binnen pakket" : "Onderdeel van pakket"}
            </p>
            <h2 className="font-display text-xl text-brass-deep italic mb-2">{ride.bundle_label}</h2>
            {isPriority ? (
              <>
                <p className="text-sm text-brass-deep/80 mb-4">
                  U heeft al een geaccepteerde rit in dit pakket. Daarom krijgt u deze vervolgrit eerst exclusief aangeboden
                  {!expired && myAssignment?.responds_by && (
                    <> tot <span className="font-semibold tabular-nums">{new Date(myAssignment.responds_by).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}</span></>
                  )}.
                  Daarna gaat het naar andere begeleiders. <strong>Weigeren of niets doen raakt uw andere geaccepteerde ritten in dit pakket niet.</strong>
                </p>
                {expired ? (
                  <p className="text-sm text-amber-800">Aanbod verlopen.</p>
                ) : !showDeclineForm ? (
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={acceptOffer}
                      disabled={bundleBusy}
                      className="px-5 py-3 bg-emerald-700 text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50"
                    >
                      ✓ Accepteer vervolgrit
                    </button>
                    <button
                      onClick={() => setShowDeclineForm(true)}
                      disabled={bundleBusy}
                      className="px-5 py-3 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/5 disabled:opacity-50"
                    >
                      ✗ Niet voor mij
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      rows={2}
                      placeholder="Reden (optioneel)…"
                      className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
                    />
                    <div className="flex gap-2">
                      <button onClick={declineOffer} disabled={bundleBusy} className="px-5 py-2.5 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold disabled:opacity-50">
                        Weigeren bevestigen
                      </button>
                      <button onClick={() => { setShowDeclineForm(false); setDeclineReason(""); }} className="px-5 py-2.5 border border-brass-deep/30 uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/5">
                        Terug
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-brass-deep/70">
                Deze rit hoort bij een groter pakket van dezelfde opdrachtgever. Mogelijk komen er nog meer vervolgritten — die krijgt u dan eerst exclusief aangeboden.
              </p>
            )}
          </section>
        );
      })()}

      {isCompleted && myAssignment && (
        <section className="bg-emerald-50/60 border border-emerald-200 p-6 md:p-8">
          <h2 className="font-display text-xl text-emerald-900 italic mb-5">Jouw uren & kosten</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Geschatte uren" value={myAssignment.estimated_hours ? `${myAssignment.estimated_hours} uur` : "—"} />
            <Field label="Geschatte kosten" value={myAssignment.estimated_cost ? `€ ${myAssignment.estimated_cost.toFixed(2)}` : "—"} />
            <Field label="Vertrokken standplaats" value={myAssignment.departed_base_at ? fmtDateTime(myAssignment.departed_base_at) : "—"} />
            <Field label="Terug op standplaats" value={myAssignment.returned_base_at ? fmtDateTime(myAssignment.returned_base_at) : "—"} />
            <Field label="Werkelijke uren" value={myAssignment.actual_hours ? `${myAssignment.actual_hours} uur` : "—"} />
            <Field label="Werkelijke kosten" value={myAssignment.actual_cost ? `€ ${myAssignment.actual_cost.toFixed(2)}` : "—"} />
            <Field label="Extra kosten" value={myAssignment.extra_costs_total ? `€ ${myAssignment.extra_costs_total.toFixed(2)}` : "—"} />
            <Field label="Totaal" value={myAssignment.actual_cost ? `€ ${(myAssignment.actual_cost + (myAssignment.extra_costs_total || 0)).toFixed(2)}` : "—"} />
          </div>
          {myAssignment.extra_costs && myAssignment.extra_costs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold mb-2">Specificatie extra kosten</p>
              <ul className="space-y-1">
                {myAssignment.extra_costs.map((ex, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-emerald-900">{ex.description}</span>
                    <span className="font-medium tabular-nums">€ {ex.amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {myAssignment.hours_notes && (
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold mb-1">Opmerkingen</p>
              <p className="text-sm text-emerald-900">{myAssignment.hours_notes}</p>
            </div>
          )}
          {myAssignment.hours_dispute_status && myAssignment.hours_dispute_status !== "none" && (
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <p className="text-[10px] uppercase tracking-widest text-red-700 font-bold mb-1">Uren afgewezen</p>
              <p className="text-sm text-red-800">{myAssignment.hours_dispute_reason || "Geen reden opgegeven"}</p>
            </div>
          )}
        </section>
      )}

      <Section title="Rit">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Vertrek" value={<MapsLink address={`${ride.pickup_address}, ${ride.pickup_city}`} lat={ride.pickup_lat} lng={ride.pickup_lng} />} />
          <Field label="Bestemming" value={<MapsLink address={`${ride.dropoff_address}, ${ride.dropoff_city}`} lat={ride.dropoff_lat} lng={ride.dropoff_lng} />} />
          <Field label="Geplande tijd" value={fmtDateTime(ride.scheduled_at)} />
          {!isCompleted && <Field label="Aantal begeleiders" value={ride.num_escorts} />}
          {!isCompleted && <Field label="Referentie opdrachtgever" value={ride.client_reference ?? "—"} />}
          {!isCompleted && (ride.cargo_length_m || ride.cargo_weight_t) && (
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
        {!isCompleted && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <MiniMap label="Vertrek" address={`${ride.pickup_address}, ${ride.pickup_city}`} lat={ride.pickup_lat} lng={ride.pickup_lng} />
            <MiniMap label="Bestemming" address={`${ride.dropoff_address}, ${ride.dropoff_city}`} lat={ride.dropoff_lat} lng={ride.dropoff_lng} />
          </div>
        )}
      </Section>

      <ExtraLegsList rideId={ride.id} />

      {isInvited ? (
        <div className="bg-brass-gold/10 border border-brass-gold/40 px-5 py-4 text-sm text-brass-deep">
          U bent uitgenodigd voor deze rit. Volledige gegevens (opdrachtgever, ontheffing, mede-begeleiders, chauffeurs) zijn pas zichtbaar nadat u de rit accepteert.
        </div>
      ) : (
      <Section title="Opdrachtgever">
        {client ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Bedrijf" value={client.company_name ?? "—"} />
            <Field label="Contactpersoon" value={client.billing_contact_name ?? client.full_name ?? "—"} />
            {!isCompleted && (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Telefoon</p>
                  <p className="text-sm"><TelLink phone={client.phone} /></p>
                </div>
                <Field label="E-mail" value={client.billing_email ?? "—"} />
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-brass-deep/50">Geen contactgegevens beschikbaar.</p>
        )}
      </Section>
      )}

      {!isInvited && !isCompleted && myAssignment && userId && (
        <Section title="Berichten">
          <AssignmentChat
            assignmentId={myAssignment.id}
            currentUserId={userId}
            counterpartyLabel="opdrachtgever"
          />
        </Section>
      )}

      {!isInvited && !isCompleted && (() => {
        const drivers = ride.drivers ?? [];
        const plates = ride.license_plates ?? [];
        if (drivers.length === 0 && plates.length === 0) return null;
        return (
          <Section title="Chauffeurs & kentekens">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-2">Chauffeurs</p>
                {drivers.length === 0 ? (
                  <p className="text-sm text-brass-deep/40">—</p>
                ) : (
                  <ul className="divide-y divide-brass-deep/10">
                    {drivers.map((d, i) => (
                      <li key={i} className="py-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">{d.name || "—"}</span>
                        <TelLink phone={d.phone} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-2">Kentekens</p>
                {plates.length === 0 ? (
                  <p className="text-sm text-brass-deep/40">—</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {plates.map((p, i) => (
                      <li key={i} className="px-3 py-1.5 bg-brass-gold/15 border border-brass-gold/40 text-sm font-mono tabular-nums tracking-wider">
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Section>
        );
      })()}

      {!isInvited && !isCompleted && (
      <Section title={`Mede-begeleiders (${others.length})`}>
        {others.length === 0 ? (
          <p className="text-sm text-brass-deep/50">U bent de enige begeleider op deze rit.</p>
        ) : (
          <ul className="divide-y divide-brass-deep/10">
            {others.map((e) => (
              <li key={e.assignment_id} className="py-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <div>
                  <p className="font-medium text-brass-deep">#{e.anonymous_id ?? "—"}</p>
                  <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">
                    {e.status === "accepted" ? "geaccepteerd" : e.status}
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
              </li>
            ))}
          </ul>
        )}
      </Section>
      )}

      {!isInvited && !isCompleted && (
      <Section title="Ontheffing">
        {permit ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Vergunningnummer" value={permit.permit_number} />
              <Field label="Geldig van" value={permit.valid_from ?? "—"} />
              <Field label="Geldig tot" value={permit.valid_to ?? "—"} />              
              <div className="md:col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">
                  Maximale afmetingen
                </p>
                <p className="text-sm font-medium tabular-nums">
                  {permit.max_length_m ?? "—"}m × {permit.max_width_m ?? "—"}m × {permit.max_height_m ?? "—"}m ·{" "}
                  {permit.max_weight_kg ? `${permit.max_weight_kg} kg` : "—"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {permit.pdf_path && (
                <button
                  type="button"
                  onClick={() => openPermitPdf(permit.pdf_path!).catch((e) => toast.error(`Kan PDF niet openen: ${e?.message ?? e}`))}
                  className="inline-block px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
                >
                  PDF openen
                </button>
              )}
              {permit.permit_number && (
                <button
                  type="button"
                  onClick={async () => {
                    const tid = toast.loading("Route ophalen van RDW…");
                    try {
                      const { data, error } = await supabase.functions.invoke("fetch-rdw-route", {
                        body: { exemptionId: permit.permit_number },
                      });
                      if (error) throw error;
                      if (!data?.gpx) throw new Error(data?.error ?? "Geen GPX ontvangen");
                      const blob = new Blob([data.gpx], { type: "application/gpx+xml" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = data.filename ?? `rdw-route-${permit.permit_number}.gpx`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      toast.success(`GPX gedownload (${data.points} punten)`, { id: tid });
                    } catch (e: any) {
                      toast.error(`GPX ophalen mislukt: ${e?.message ?? e}`, { id: tid });
                    }
                  }}
                  className="inline-block px-6 py-3 border-2 border-brass-deep text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep hover:text-parchment transition-colors"
                >
                  GPX van RDW-route
                </button>
              )}
            </div>
            <p className="text-xs text-brass-deep/50 mt-2">
              Let op: gebruik dit enkel als hulpmiddel. De begeleider is zelf verantwoordelijk voor de route.
              ViaCust is op geen enkele manier aansprakelijk voor een verkeerde route en alles wat daaruit voortvloeit.
            </p>
          </div>
        ) : ride.permit_number ? (
          <p className="text-sm text-brass-deep/60">Vergunning {ride.permit_number} (geen document beschikbaar)</p>
        ) : (
          <p className="text-sm text-brass-deep/50">Geen ontheffing gekoppeld.</p>
        )}
      </Section>
      )}

      {!isInvited && !isCompleted && myAssignment && (
        <Section title="Annulering">
          {myAssignment.cancel_request_status === "pending" ? (
            <div className="bg-brass-gold/10 border border-brass-gold/40 p-4 text-sm text-brass-deep">
              <p className="font-semibold mb-1">Verzoek in behandeling</p>
              {myAssignment.cancel_request_reason && (
                <p className="italic text-brass-deep/70">"{myAssignment.cancel_request_reason}"</p>
              )}
              <p className="mt-2 text-xs text-brass-deep/60">De opdrachtgever moet je verzoek goedkeuren.</p>
            </div>
          ) : myAssignment.cancel_request_status === "rejected" ? (
            <div className="bg-red-50 border border-red-200 p-4 text-sm text-red-900 mb-3">
              Vorig verzoek afgewezen. Je kunt opnieuw aanvragen.
              <button
                type="button"
                onClick={() => setShowCancelForm(true)}
                className="ml-3 underline font-semibold"
              >
                Opnieuw aanvragen
              </button>
            </div>
          ) : !showCancelForm ? (
            <>
              <p className="text-sm text-brass-deep/70 mb-3">
                Annuleren kan alleen in overleg met de opdrachtgever. Stuur een verzoek met reden; bij goedkeuring vervalt de toewijzing zonder kosten.
              </p>
              <button
                type="button"
                onClick={() => setShowCancelForm(true)}
                className="px-6 py-3 border border-red-700 text-red-700 uppercase tracking-widest text-xs font-semibold hover:bg-red-700 hover:text-parchment transition-colors"
              >
                Annulering aanvragen
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Reden voor annulering (verplicht)…"
                className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={submitCancelRequest}
                  className="px-5 py-2.5 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold disabled:opacity-50"
                >
                  Verzoek versturen
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCancelForm(false); setCancelReason(""); }}
                  className="px-5 py-2.5 border border-brass-deep/30 uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/5"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
};

const EscortRideDetail = () => (
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

export default EscortRideDetail;
