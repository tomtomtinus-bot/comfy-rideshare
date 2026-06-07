import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { MiniMap } from "@/components/site/MiniMap";
import { MapsLink } from "@/components/site/MapsLink";
import { openPermitPdf } from "@/lib/openPermitPdf";
import { AssignmentChat } from "@/components/site/AssignmentChat";
import { SwapRequestDialog } from "@/components/site/SwapRequestDialog";
import { SwapPendingBanner } from "@/components/site/SwapPendingBanner";
import { ExtraLegsList } from "@/components/site/ExtraLegsList";
import { toast } from "sonner";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ReplacementEscortPicker } from "@/components/site/ReplacementEscortPicker";

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
    cert_verified_countries: string[] | null;
    languages: string[] | null;
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

const AccSection = ({
  value,
  title,
  badge,
  children,
}: {
  value: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <AccordionItem value={value} className="bg-card border border-input rounded-lg overflow-hidden">
    <AccordionTrigger className="px-5 md:px-6 py-4 hover:no-underline">
      <span className="flex items-center gap-3 text-base font-semibold text-foreground">
        {title}
        {badge}
      </span>
    </AccordionTrigger>
    <AccordionContent className="px-5 md:px-6 pt-0 pb-5 md:pb-6">{children}</AccordionContent>
  </AccordionItem>
);

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{label}</p>
    <p className="text-sm font-medium text-foreground">{value || <span className="text-muted-foreground">—</span>}</p>
  </div>
);

const TelLink = ({ phone }: { phone: string | null | undefined }) =>
  phone ? (
    <a href={`tel:${phone}`} className="text-primary hover:underline font-medium">
      {phone}
    </a>
  ) : (
    <span className="text-muted-foreground">—</span>
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
  const [hoursMap, setHoursMap] = useState<Record<string, { actual_hours: number | null; actual_cost: number | null; hours_submitted_at: string | null; hours_notes: string | null; departed_base_at: string | null; returned_base_at: string | null; extra_costs: any; extra_costs_total: number | null; hours_dispute_status: string; hours_dispute_reason: string | null; travel_to_pickup_min: number | null; travel_back_home_min: number | null; }>>({});
  const [disputeFor, setDisputeFor] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [swapFor, setSwapFor] = useState<{ assignmentId: string; anon: string | null } | null>(null);
  const [swapTick, setSwapTick] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);

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
    // Fetch cancel-request status + hours per assignment
    const { data: ras } = await supabase
      .from("ride_assignments")
      .select("id, cancel_request_status, cancel_request_reason, actual_hours, actual_cost, hours_submitted_at, hours_notes, departed_base_at, returned_base_at, extra_costs, extra_costs_total, hours_dispute_status, hours_dispute_reason, travel_to_pickup_min, travel_back_home_min")
      .eq("ride_id", id);
    const map: Record<string, { status: string; reason: string | null }> = {};
    const hmap: Record<string, any> = {};
    (ras ?? []).forEach((r: any) => {
      map[r.id] = { status: r.cancel_request_status ?? "none", reason: r.cancel_request_reason ?? null };
      hmap[r.id] = {
        actual_hours: r.actual_hours,
        actual_cost: r.actual_cost,
        hours_submitted_at: r.hours_submitted_at,
        hours_notes: r.hours_notes,
        departed_base_at: r.departed_base_at,
        returned_base_at: r.returned_base_at,
        extra_costs: r.extra_costs,
        extra_costs_total: r.extra_costs_total,
        hours_dispute_status: r.hours_dispute_status ?? "none",
        hours_dispute_reason: r.hours_dispute_reason ?? null,
        travel_to_pickup_min: r.travel_to_pickup_min,
        travel_back_home_min: r.travel_back_home_min,
      };
    });
    setCancelReqs(map);
    setHoursMap(hmap);
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
    let searchReplacement = false;
    if (approve) {
      searchReplacement = confirm(
        "Annulering goedkeuren.\n\nWil je automatisch een nieuwe begeleider zoeken?\n\n• OK = Ja, stuur uitnodigingen naar passende begeleiders (excl. de annulator)\n• Annuleer = Nee, rit wordt afgerond als er geen begeleiders meer over zijn"
      );
    }
    setBusy(true);
    const { data: res, error } = await supabase.rpc("client_decide_cancellation", {
      _assignment_id: assignmentId,
      _approve: approve,
      _search_replacement: searchReplacement,
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!approve) {
      toast.success("Verzoek afgewezen.");
    } else {
      const r = res as any;
      if (r?.replacement) {
        toast.success(`Annulering goedgekeurd. ${r.invited ?? 0} nieuwe begeleider(s) uitgenodigd.`);
      } else if (r?.remaining_accepted === 0) {
        toast.success("Annulering goedgekeurd. Rit is afgerond.");
      } else {
        toast.success("Annulering goedgekeurd.");
      }
    }
    load();
  };

  const submitDispute = async () => {
    if (!disputeFor) return;
    const reason = disputeReason.trim();
    if (reason.length < 5) { toast.error("Geef een korte reden op (min. 5 tekens)."); return; }
    setBusy(true);
    const { error } = await supabase
      .from("ride_assignments")
      .update({
        hours_dispute_status: "disputed",
        hours_dispute_reason: reason,
        hours_disputed_at: new Date().toISOString(),
      } as never)
      .eq("id", disputeFor);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Uren afgewezen. De begeleider is op de hoogte gebracht.");
    setDisputeFor(null);
    setDisputeReason("");
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Laden…</p>;
  if (error || !data) {
    return (
      <div className="bg-card border border-input rounded-lg p-10 text-center">
        <p className="text-sm text-muted-foreground mb-4">Geen toegang tot deze ritdetails.</p>
        <p className="text-xs text-muted-foreground mb-4">
          Ondersteuning nodig?{" "}
          <a href="mailto:support@viacust.com" className="text-primary hover:underline">
            support@viacust.com
          </a>
        </p>
        <Link to="/dashboard" className="text-sm text-primary hover:underline font-medium">
          ← Terug naar dashboard
        </Link>
      </div>
    );
  }

  const { ride, escorts, permit } = data;
  const drivers = ride.drivers ?? [];
  const plates = ride.license_plates ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground font-medium">
          ← Terug naar mijn ritten
        </Link>
        <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {ride.pickup_city} <span className="text-muted-foreground font-normal">→</span> {ride.dropoff_city}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{fmtDateTime(ride.scheduled_at)}</p>
          </div>
          {ride.status !== "cancelled" && (
            <Link
              to={`/rit/${ride.id}/bewerk`}
              className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Bewerken
            </Link>
          )}
        </header>
      </div>

      {userId && (
        <SwapPendingBanner key={swapTick} rideId={ride.id} currentUserId={userId} onChanged={load} />
      )}

      <ExtraLegsList rideId={ride.id} />

      {ride.status === "cancelled" && (
        <div className="bg-red-50 border border-red-200 p-5 text-sm text-red-900">
          Deze rit is geannuleerd.
        </div>
      )}

      {(() => {
        const acceptedCount = escorts.filter((e) => e.status === "accepted").length;
        const invitedCount = escorts.filter((e) => e.status === "invited").length;
        const declinedCount = escorts.filter((e) => e.status === "declined" || e.status === "expired").length;
        const needsNewEscort =
          ride.status !== "cancelled" &&
          ride.status !== "completed" &&
          acceptedCount === 0 &&
          invitedCount === 0 &&
          declinedCount > 0;
        if (!needsNewEscort) return null;
        const handleAuto = async () => {
          if (autoBusy) return;
          setAutoBusy(true);
          const limit = Math.max(1, ride.num_escorts ?? 1) * 5;
          const { data, error } = await supabase.rpc("invite_replacement_escorts", {
            _ride_id: ride.id,
            _limit: limit,
          });
          setAutoBusy(false);
          if (error) return toast.error(error.message);
          const n = typeof data === "number" ? data : 0;
          if (n === 0) toast.info("Geen extra begeleiders gevonden om uit te nodigen.");
          else toast.success(`${n} begeleider${n === 1 ? "" : "s"} uitgenodigd.`);
          load();
        };
        return (
          <div className="bg-red-50 border-l-4 border-red-600 p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-red-900">
                Alle uitgenodigde begeleiders hebben deze rit afgewezen.
              </p>
              <p className="text-xs text-red-800/80 mt-1">
                Kies handmatig een nieuwe begeleider of laat ViaCust automatisch passende begeleiders uitnodigen.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setPickerOpen(true)}
                className="px-5 py-2.5 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold transition-colors"
              >
                Kies nieuwe begeleider
              </button>
              <button
                disabled={autoBusy}
                onClick={handleAuto}
                className="px-5 py-2.5 border border-brass-deep/40 text-brass-deep uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-deep/5 disabled:opacity-50"
              >
                {autoBusy ? "Zoeken…" : "Automatisch zoeken"}
              </button>
              <button
                disabled={busy}
                onClick={handleCancelRide}
                className="px-5 py-2.5 border border-red-700/60 text-red-800 uppercase tracking-widest text-[10px] font-semibold hover:bg-red-700 hover:text-parchment disabled:opacity-50 transition-colors"
              >
                Rit annuleren
              </button>
            </div>
          </div>
        );
      })()}

      <ReplacementEscortPicker
        rideId={ride.id}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onInvited={load}
      />

      {(() => {
        const hasPendingCancel = Object.values(cancelReqs).some((c) => c.status === "pending");
        const hasSubmittedHours = Object.values(hoursMap).some((h: any) => h?.hours_submitted_at);
        const defaultOpen: string[] = ["rit"];
        if (hasPendingCancel) { defaultOpen.push("begeleiders"); defaultOpen.push("annulering"); }
        if (hasSubmittedHours) defaultOpen.push("begeleiders");
        return (
          <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-4">
            <AccSection value="rit" title="Rit">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Vertrek" value={<MapsLink address={`${ride.pickup_address}, ${ride.pickup_city}`} lat={ride.pickup_lat} lng={ride.pickup_lng} />} />
                <Field label="Bestemming" value={<MapsLink address={`${ride.dropoff_address}, ${ride.dropoff_city}`} lat={ride.dropoff_lat} lng={ride.dropoff_lng} />} />
                <Field label="Geplande tijd" value={fmtDateTime(ride.scheduled_at)} />
                <Field label="Aantal begeleiders" value={ride.num_escorts} />
                <Field label="Eigen referentie" value={ride.client_reference ?? "—"} />
                <Field label="Vergunningnummer" value={ride.permit_number ?? "—"} />
                {(ride.cargo_length_m || ride.cargo_weight_t) && (
                  <div className="md:col-span-2">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">Lading</p>
                    <p className="text-sm font-medium tabular-nums">
                      {ride.cargo_length_m ?? "—"}m × {ride.cargo_width_m ?? "—"}m × {ride.cargo_height_m ?? "—"}m ·{" "}
                      {ride.cargo_weight_t ?? "—"}t
                    </p>
                  </div>
                )}
                {ride.notes && (
                  <div className="md:col-span-2">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">Opmerkingen</p>
                    <p className="text-sm">{ride.notes}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <MiniMap label="Vertrek" address={`${ride.pickup_address}, ${ride.pickup_city}`} lat={ride.pickup_lat} lng={ride.pickup_lng} />
                <MiniMap label="Bestemming" address={`${ride.dropoff_address}, ${ride.dropoff_city}`} lat={ride.dropoff_lat} lng={ride.dropoff_lng} />
              </div>
            </AccSection>

            <AccSection value="chauffeurs" title={`Chauffeurs (${drivers.length})`}>
              {drivers.length === 0 ? (
                <p className="text-sm text-brass-deep/80">Geen chauffeurs opgegeven.</p>
              ) : (
                <ul className="divide-y divide-brass-deep/10">
                  {drivers.map((d, i) => (
                    <li key={i} className="py-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <p className="font-medium">{d.name || <span className="text-brass-deep/80">—</span>}</p>
                      <TelLink phone={d.phone} />
                    </li>
                  ))}
                </ul>
              )}
            </AccSection>

            <AccSection value="kentekens" title={`Kentekens (${plates.length})`}>
              {plates.length === 0 ? (
                <p className="text-sm text-brass-deep/80">Geen kentekens opgegeven.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {plates.map((p, i) => (
                    <li key={i} className="px-3 py-1.5 bg-brass-gold/15 border border-brass-gold/40 text-sm font-mono tabular-nums tracking-wider">
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </AccSection>

            <AccSection value="begeleiders" title={`Begeleiders (${escorts.length})`}>
              {escorts.length === 0 ? (
                <p className="text-sm text-brass-deep/80">Nog geen begeleiders toegewezen.</p>
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
                              <p className="text-xs text-brass-deep/80">{e.base_city ?? ""}</p>
                            </>
                          ) : (
                            <p className="text-brass-deep/80 text-xs italic">Nog niet bevestigd</p>
                          )}
                        </div>
                        <div className="text-sm">
                          <TelLink phone={e.phone} />
                        </div>
                        <div className="text-xs text-brass-deep/80 space-y-1">
                          <p>{e.vehicle_type ?? ""}</p>
                          {e.cert_verified_countries && e.cert_verified_countries.length > 0 && (
                            <p className="flex flex-wrap gap-1">
                              {e.cert_verified_countries.map((c) => (
                                <span
                                  key={c}
                                  title="Certificaat geverifieerd door ViaCust"
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-brass-gold/20 text-brass-deep text-[10px] uppercase tracking-widest font-bold"
                                >
                                  ✓ {c}
                                </span>
                              ))}
                            </p>
                          )}
                          {e.languages && e.languages.length > 0 && (
                            <p className="text-[10px]">Talen: {e.languages.join(", ")}</p>
                          )}
                        </div>
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
                      {(() => {
                        const h = hoursMap[e.assignment_id];
                        if (!h?.hours_submitted_at) return null;
                        const disputed = h.hours_dispute_status === "disputed";
                        const fmt = (d: string | null) => d ? new Date(d).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" }) : "—";
                        return (
                          <div className={`p-3 border ${disputed ? "border-destructive/40 bg-destructive/5" : "border-brass-deep/15 bg-parchment/40"} space-y-2`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs uppercase tracking-widest font-bold text-brass-deep">
                                Ingediende uren {disputed && <span className="text-destructive ml-2">· afgewezen</span>}
                              </p>
                              <p className="text-sm font-semibold tabular-nums">
                                {h.actual_hours}u · €{Number(h.actual_cost ?? 0).toFixed(2)}
                              </p>
                            </div>
                            {(() => {
                              const aanvoerMin = h.travel_to_pickup_min ?? 0;
                              const afvoerMin = h.travel_back_home_min ?? 0;
                              const totalMin = h.departed_base_at && h.returned_base_at
                                ? Math.max(0, (new Date(h.returned_base_at).getTime() - new Date(h.departed_base_at).getTime()) / 60000)
                                : (h.actual_hours ?? 0) * 60;
                              const begeleidingMin = Math.max(0, totalMin - aanvoerMin - afvoerMin);
                              const fmtDur = (m: number) => {
                                const hh = Math.floor(m / 60);
                                const mm = Math.round(m % 60);
                                return mm === 0 ? `${hh}u` : `${hh}u ${mm}m`;
                              };
                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-brass-deep/80">
                                  <div className="bg-parchment/60 border border-brass-deep/10 p-2">
                                    <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-0.5">Aanvoer</p>
                                    <p className="font-semibold tabular-nums">{fmtDur(aanvoerMin)}</p>
                                    <p className="text-[10px] opacity-60 mt-0.5">Vertrek standplaats: {fmt(h.departed_base_at)}</p>
                                  </div>
                                  <div className="bg-parchment/60 border border-brass-deep/10 p-2">
                                    <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-0.5">Begeleidingstijd</p>
                                    <p className="font-semibold tabular-nums">{fmtDur(begeleidingMin)}</p>
                                  </div>
                                  <div className="bg-parchment/60 border border-brass-deep/10 p-2">
                                    <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-0.5">Afvoer</p>
                                    <p className="font-semibold tabular-nums">{fmtDur(afvoerMin)}</p>
                                    <p className="text-[10px] opacity-60 mt-0.5">Terug standplaats: {fmt(h.returned_base_at)}</p>
                                  </div>
                                </div>
                              );
                            })()}
                            {h.extra_costs_total != null && Number(h.extra_costs_total) > 0 && (
                              <p className="text-xs text-brass-deep/70">Extra kosten: €{Number(h.extra_costs_total).toFixed(2)}</p>
                            )}
                            {h.hours_notes && <p className="text-xs italic text-brass-deep/70">"{h.hours_notes}"</p>}
                            {disputed ? (
                              <p className="text-xs text-destructive">
                                Afgewezen{h.hours_dispute_reason ? `: "${h.hours_dispute_reason}"` : ""}. Wacht op nieuwe indiening door begeleider.
                              </p>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setDisputeFor(e.assignment_id); setDisputeReason(""); }}
                                className="text-[10px] uppercase tracking-widest font-semibold text-destructive hover:underline"
                              >
                                Uren afwijzen
                              </button>
                            )}
                          </div>
                        );
                      })()}
                      {e.status === "accepted" && (
                        <button
                          type="button"
                          onClick={() => setSwapFor({ assignmentId: e.assignment_id, anon: e.anonymous_id })}
                          className="text-[10px] uppercase tracking-widest font-semibold text-brass-deep/70 hover:text-brass-gold underline-offset-4 hover:underline"
                        >
                          🔄 Verplaats naar andere rit
                        </button>
                      )}
                      {e.status === "accepted" && userId && (
                        <AssignmentChat
                          assignmentId={e.assignment_id}
                          currentUserId={userId}
                          counterpartyLabel={`begeleider #${e.anonymous_id ?? "—"}`}
                        />
                      )}
                    </li>
                    );
                  })}
                </ul>
              )}
            </AccSection>

            {ride.status !== "cancelled" && ride.status !== "completed" && (
              <AccSection value="annulering" title="Annulering">
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
              </AccSection>
            )}

            <AccSection value="ontheffing" title="Ontheffing">
              {permit ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Vergunningnummer" value={permit.permit_number} />
                    <Field label="Geldig van" value={permit.valid_from ?? "—"} />
                    <Field label="Geldig tot" value={permit.valid_to ?? "—"} />
                    <div className="md:col-span-2">
                      <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">Maximale afmetingen</p>
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
                <p className="text-sm text-brass-deep/80">Vergunning {ride.permit_number} (geen document beschikbaar)</p>
              ) : (
                <p className="text-sm text-brass-deep/80">Geen ontheffing gekoppeld.</p>
              )}
            </AccSection>
          </Accordion>
        );
      })()}
      {swapFor && (
        <SwapRequestDialog
          open={!!swapFor}
          onOpenChange={(o) => { if (!o) setSwapFor(null); }}
          sourceAssignmentId={swapFor.assignmentId}
          escortAnon={swapFor.anon}
          onCreated={() => { setSwapFor(null); setSwapTick((t) => t + 1); load(); }}
        />
      )}
      {disputeFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setDisputeFor(null)}
        >
          <div
            className="bg-card max-w-md w-full p-6 space-y-4 shadow-etched"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 className="font-display italic text-xl text-brass-deep">Uren afwijzen</h3>
            <p className="text-sm text-brass-deep/70">
              Geef aan waarom de ingediende uren niet kloppen. De begeleider ontvangt een melding en kan opnieuw indienen.
            </p>
            <textarea
              value={disputeReason}
              onChange={(ev) => setDisputeReason(ev.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Bijv. starttijd was 09:00 i.p.v. 08:00"
              className="w-full border border-brass-deep/20 bg-background px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDisputeFor(null)}
                className="px-4 py-2 border border-brass-deep/30 uppercase tracking-widest text-[10px] font-semibold disabled:opacity-50"
              >
                Annuleer
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submitDispute}
                className="px-4 py-2 bg-destructive text-destructive-foreground uppercase tracking-widest text-[10px] font-semibold disabled:opacity-50"
              >
                Afwijzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ClientRideDetail = () => (
  <RequireAuth>
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-5 md:px-8 py-6 md:py-8 min-h-[calc(100vh-5rem)]">
        <div className="max-w-5xl mx-auto">
          <Inner />
        </div>
      </main>
      <Footer />
    </div>
  </RequireAuth>
);

export default ClientRideDetail;
