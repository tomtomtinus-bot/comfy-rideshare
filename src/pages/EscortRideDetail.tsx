import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { MiniMap } from "@/components/site/MiniMap";
import { MapsLink } from "@/components/site/MapsLink";
import { openPermitPdf } from "@/lib/openPermitPdf";
import { AssignmentChat } from "@/components/site/AssignmentChat";
import { SwapPendingBanner } from "@/components/site/SwapPendingBanner";
import { AssignDriverPanel } from "@/components/site/AssignDriverPanel";
import { ExtraLegsList } from "@/components/site/ExtraLegsList";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
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

const fmtDateTime = (d: string, lng: string = "nl") => {
  const locale = lng === "nl" ? "nl-NL" : lng === "de" ? "de-DE" : lng === "fr" ? "fr-FR" : "en-GB";
  return new Date(d).toLocaleString(locale, { dateStyle: "full", timeStyle: "short" });
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-card border border-input rounded-lg p-5 md:p-6">
    <h2 className="text-base font-semibold text-foreground mb-4">{title}</h2>
    {children}
  </section>
);

const Badge = ({ children, tone = "alert" }: { children: React.ReactNode; tone?: "alert" | "info" }) => (
  <span
    className={
      "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-full " +
      (tone === "alert" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground")
    }
  >
    {children}
  </span>
);

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

const Inner = () => {
  const { t, i18n } = useTranslation();
  const fd = (d: string) => fmtDateTime(d, i18n.language);
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
    travel_to_pickup_min: number | null;
    travel_back_home_min: number | null;
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
  const [unreadMessages, setUnreadMessages] = useState(0);

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
          estimated_hours, estimated_cost,
          travel_to_pickup_min, travel_back_home_min
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
        travel_to_pickup_min: (ra as any).travel_to_pickup_min ?? null,
        travel_back_home_min: (ra as any).travel_back_home_min ?? null,
      });

      // unread messages count for this assignment
      if (ra) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("assignment_id", (ra as any).id)
          .neq("sender_id", u.user.id)
          .is("read_at", null);
        setUnreadMessages(count ?? 0);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const submitCancelRequest = async () => {
    if (!myAssignment) return;
    if (cancelReason.trim().length < 3) { toast.error(t("escortRideDetail.cancelReasonShort")); return; }
    setBusy(true);
    const { error } = await supabase.rpc("escort_request_cancellation", {
      _assignment_id: myAssignment.id,
      _reason: cancelReason.trim(),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("escortRideDetail.cancelRequestSent"));
    supabase.functions.invoke("request-ride-notification", {
      body: {
        event: "escort_cancelled",
        rideId: id,
        escortUserId: userId,
        reason: cancelReason.trim(),
      },
    }).catch(() => { /* stil falen */ });
    setShowCancelForm(false);
    setCancelReason("");
    load();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("escortRideDetail.loading")}</p>;
  }
  if (error || !data) {
    return (
      <div className="bg-card border border-input rounded-lg p-10 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          {t("escortRideDetail.noAccess")}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {t("escortRideDetail.supportNeeded")}{" "}
          <a href="mailto:support@viacust.com" className="text-primary hover:underline">
            support@viacust.com
          </a>
        </p>
        <Link to="/dashboard" className="text-sm text-primary hover:underline font-medium">
          {t("escortRideDetail.backToDashboard")}
        </Link>
      </div>
    );
  }

  const { ride, client, escorts, permit, viewer_status } = data;
  const isInvited = viewer_status === "invited";
  const isCompleted = ride.status === "completed" || !!myAssignment?.hours_submitted_at;
  const others = escorts.filter((e) => !e.is_self);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground font-medium"
        >
          ← {t("escortRideDetail.backToTasks")}
        </Link>
        <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {ride.pickup_city} <span className="text-muted-foreground font-normal">→</span> {ride.dropoff_city}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{fd(ride.scheduled_at)}</p>
          </div>
          {isCompleted && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
              {t("escortRideDetail.completed")}
            </span>
          )}
        </header>
      </div>

      {userId && (
        <SwapPendingBanner rideId={ride.id} currentUserId={userId} onChanged={load} />
      )}

      <AssignDriverPanel rideId={ride.id} onChanged={load} />


      {ride.bundle_id && ride.bundle_label && (() => {
        const isPriority = !!myAssignment?.bundle_priority_offer && myAssignment.status === "invited";
        const expired = myAssignment?.responds_by ? new Date(myAssignment.responds_by).getTime() < Date.now() : false;
        const acceptOffer = async () => {
          if (!myAssignment) return;
          setBundleBusy(true);
          const { error } = await supabase.rpc("accept_bundle_priority_offer", { _assignment_id: myAssignment.id });
          setBundleBusy(false);
          if (error) return toast.error(error.message);
          toast.success(t("escortRideDetail.bundleAccepted"));
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
          toast.success(t("escortRideDetail.bundleDeclined"));
          setShowDeclineForm(false);
          setDeclineReason("");
          load();
        };
        return (
          <section className="bg-brass-gold/10 border-l-4 border-brass-gold p-5 md:p-6">
            <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-1">
              {isPriority ? t("escortRideDetail.bundlePriorityKicker") : t("escortRideDetail.bundleKicker")}
            </p>
            <h2 className="font-display text-xl text-brass-deep italic mb-2">{ride.bundle_label}</h2>
            {isPriority ? (
              <>
                <p className="text-sm text-brass-deep/80 mb-4">
                  {t("escortRideDetail.bundlePriorityBody")}
                  {!expired && myAssignment?.responds_by && (
                    <> {t("escortRideDetail.bundleUntil")} <span className="font-semibold tabular-nums">{new Date(myAssignment.responds_by).toLocaleString(i18n.language === "nl" ? "nl-NL" : i18n.language === "de" ? "de-DE" : i18n.language === "fr" ? "fr-FR" : "en-GB", { dateStyle: "short", timeStyle: "short" })}</span></>
                  )}
                  <span dangerouslySetInnerHTML={{ __html: t("escortRideDetail.bundleAfter") }} />
                </p>
                {expired ? (
                  <p className="text-sm text-amber-800">{t("escortRideDetail.bundleExpired")}</p>
                ) : !showDeclineForm ? (
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={acceptOffer}
                      disabled={bundleBusy}
                      className="px-5 py-3 bg-emerald-700 text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50"
                    >
                      {t("escortRideDetail.bundleAcceptNext")}
                    </button>
                    <button
                      onClick={() => setShowDeclineForm(true)}
                      disabled={bundleBusy}
                      className="px-5 py-3 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/5 disabled:opacity-50"
                    >
                      {t("escortRideDetail.bundleNotForMe")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      rows={2}
                      placeholder={t("escortRideDetail.bundleReasonPlaceholder")}
                      className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
                    />
                    <div className="flex gap-2">
                      <button onClick={declineOffer} disabled={bundleBusy} className="px-5 py-2.5 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold disabled:opacity-50">
                        {t("escortRideDetail.bundleConfirmDecline")}
                      </button>
                      <button onClick={() => { setShowDeclineForm(false); setDeclineReason(""); }} className="px-5 py-2.5 border border-brass-deep/30 uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/5">
                        {t("escortRideDetail.bundleBack")}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-brass-deep/70">
                {t("escortRideDetail.bundleInfo")}
              </p>
            )}
          </section>
        );
      })()}

      {isCompleted && myAssignment && (
        <section className="bg-emerald-50/60 border border-emerald-200 p-6 md:p-8">
          <h2 className="font-display text-xl text-emerald-900 italic mb-5">{t("escortRideDetail.hoursTitle")}</h2>
          {(() => {
            const ceilQ = (m: number) => Math.ceil(m / 15) * 15;
            const fmtH = (m: number | null) => {
              if (m == null) return "—";
              const q = ceilQ(m);
              const h = Math.floor(q / 60);
              const min = q % 60;
              return min === 0 ? `${h} ${t("escortRideDetail.hoursUnit")}` : `${h}u${String(min).padStart(2, "0")}`;
            };
            const startBegeleiding = myAssignment.departed_base_at && myAssignment.travel_to_pickup_min != null
              ? new Date(new Date(myAssignment.departed_base_at).getTime() + ceilQ(myAssignment.travel_to_pickup_min) * 60_000).toISOString()
              : null;
            const eindeBegeleiding = myAssignment.returned_base_at && myAssignment.travel_back_home_min != null
              ? new Date(new Date(myAssignment.returned_base_at).getTime() - ceilQ(myAssignment.travel_back_home_min) * 60_000).toISOString()
              : null;
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label={t("escortRideDetail.travelIn")} value={fmtH(myAssignment.travel_to_pickup_min)} />
                <Field label={t("escortRideDetail.departedBase")} value={myAssignment.departed_base_at ? fd(myAssignment.departed_base_at) : "—"} />
                <Field label={t("escortRideDetail.rideStart")} value={startBegeleiding ? fd(startBegeleiding) : "—"} />
                <Field label={t("escortRideDetail.rideEnd")} value={eindeBegeleiding ? fd(eindeBegeleiding) : "—"} />
                <Field label={t("escortRideDetail.travelOut")} value={fmtH(myAssignment.travel_back_home_min)} />
                <Field label={t("escortRideDetail.returnedBase")} value={myAssignment.returned_base_at ? fd(myAssignment.returned_base_at) : "—"} />
                <Field label={t("escortRideDetail.actualHours")} value={myAssignment.actual_hours ? `${myAssignment.actual_hours} ${t("escortRideDetail.hoursUnit")}` : "—"} />
                <Field label={t("escortRideDetail.actualCost")} value={myAssignment.actual_cost != null ? `€ ${(myAssignment.actual_cost - (myAssignment.extra_costs_total || 0)).toFixed(2)}` : "—"} />
                <Field label={t("escortRideDetail.extraCosts")} value={myAssignment.extra_costs_total ? `€ ${myAssignment.extra_costs_total.toFixed(2)}` : "—"} />
                <Field label={t("escortRideDetail.total")} value={myAssignment.actual_cost != null ? `€ ${myAssignment.actual_cost.toFixed(2)}` : "—"} />
                <p className="md:col-span-2 text-xs text-brass-deep/80 italic mt-1">
                  {t("escortRideDetail.fuelLater")}
                </p>
              </div>
            );
          })()}
          {myAssignment.extra_costs && myAssignment.extra_costs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold mb-2">{t("escortRideDetail.extraCostsSpec")}</p>
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
              <p className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold mb-1">{t("escortRideDetail.notes")}</p>
              <p className="text-sm text-emerald-900">{myAssignment.hours_notes}</p>
            </div>
          )}
          {myAssignment.hours_dispute_status && myAssignment.hours_dispute_status !== "none" && (
            <div className="mt-4 pt-4 border-t border-emerald-200">
              <p className="text-[10px] uppercase tracking-widest text-red-700 font-bold mb-1">{t("escortRideDetail.hoursRejected")}</p>
              <p className="text-sm text-red-800">{myAssignment.hours_dispute_reason || t("escortRideDetail.noReason")}</p>
            </div>
          )}
        </section>
      )}

      {(() => {
        const drivers = ride.drivers ?? [];
        const plates = ride.license_plates ?? [];
        const hasDriversOrPlates = drivers.length > 0 || plates.length > 0;
        const cancelPending = myAssignment?.cancel_request_status === "pending";
        const cancelRejected = myAssignment?.cancel_request_status === "rejected";
        const hoursRejected = myAssignment?.hours_dispute_status === "rejected";
        const showAnnulering = !isInvited && !isCompleted && !!myAssignment;

        // Determine which items should be open by default (those with alerts)
        const defaultOpen: string[] = ["rit"];
        if (unreadMessages > 0) defaultOpen.push("berichten");
        if (cancelPending || cancelRejected) defaultOpen.push("annulering");
        if (hoursRejected) defaultOpen.push("uren");

        return (
          <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-4">
            <AccSection value="rit" title={t("escortRideDetail.ride")}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label={t("escortRideDetail.pickup")} value={<MapsLink address={`${ride.pickup_address}, ${ride.pickup_city}`} lat={ride.pickup_lat} lng={ride.pickup_lng} />} />
                <Field label={t("escortRideDetail.dropoff")} value={<MapsLink address={`${ride.dropoff_address}, ${ride.dropoff_city}`} lat={ride.dropoff_lat} lng={ride.dropoff_lng} />} />
                <Field label={t("escortRideDetail.scheduledTime")} value={fd(ride.scheduled_at)} />
                {!isCompleted && <Field label={t("escortRideDetail.numEscorts")} value={ride.num_escorts} />}
                {!isCompleted && <Field label={t("escortRideDetail.clientRef")} value={ride.client_reference ?? "—"} />}
                {!isCompleted && (ride.cargo_length_m || ride.cargo_weight_t) && (
                  <div className="md:col-span-2">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">{t("escortRideDetail.cargo")}</p>
                    <p className="text-sm font-medium tabular-nums">
                      {ride.cargo_length_m ?? "—"}m × {ride.cargo_width_m ?? "—"}m × {ride.cargo_height_m ?? "—"}m ·{" "}
                      {ride.cargo_weight_t ?? "—"}t
                    </p>
                  </div>
                )}
                {ride.notes && (
                  <div className="md:col-span-2">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">{t("escortRideDetail.notes")}</p>
                    <p className="text-sm">{ride.notes}</p>
                  </div>
                )}
              </div>
              {!isCompleted && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MiniMap label={t("escortRideDetail.pickup")} address={`${ride.pickup_address}, ${ride.pickup_city}`} lat={ride.pickup_lat} lng={ride.pickup_lng} />
                  <MiniMap label={t("escortRideDetail.dropoff")} address={`${ride.dropoff_address}, ${ride.dropoff_city}`} lat={ride.dropoff_lat} lng={ride.dropoff_lng} />
                </div>
              )}
              <div className="mt-6">
                <ExtraLegsList rideId={ride.id} />
              </div>
            </AccSection>

            {isInvited && (
              <div className="bg-brass-gold/10 border border-brass-gold/40 px-5 py-4 text-sm text-brass-deep space-y-3">
                <p>
                  {t("escortRideDetail.invitedNotice")}
                </p>
                {myAssignment && myAssignment.status === "invited" && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const { error } = await supabase.rpc("express_ride_interest", { _assignment_id: myAssignment.id });
                        setBusy(false);
                        if (error) return toast.error(error.message);
                        toast.success(t("escortRideDetail.availableReported"));
                        load();
                      }}
                      className="px-5 py-3 bg-emerald-700 text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50"
                    >
                      {t("escortRideDetail.acceptRide")}
                    </button>
                    <button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const { error } = await supabase
                          .from("ride_assignments")
                          .update({ status: "declined", responded_at: new Date().toISOString() })
                          .eq("id", myAssignment.id);
                        setBusy(false);
                        if (error) return toast.error(error.message);
                        toast.success(t("escortRideDetail.rideDeclined"));
                        load();
                      }}
                      className="px-5 py-3 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/5 disabled:opacity-50"
                    >
                      {t("escortRideDetail.declineRide")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isInvited && (
              <AccSection value="opdrachtgever" title={t("escortRideDetail.client")}>
                {client ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label={t("escortRideDetail.company")} value={client.company_name ?? "—"} />
                    <Field label={t("escortRideDetail.contactPerson")} value={client.billing_contact_name ?? client.full_name ?? "—"} />
                    {!isCompleted && (
                      <>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">{t("escortRideDetail.phone")}</p>
                          <p className="text-sm"><TelLink phone={client.phone} /></p>
                        </div>
                        <Field label={t("escortRideDetail.email")} value={client.billing_email ?? "—"} />
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-brass-deep/80">{t("escortRideDetail.noContact")}</p>
                )}
              </AccSection>
            )}

            {!isInvited && !isCompleted && myAssignment && userId && (
              <AccSection
                value="berichten"
                title={t("escortRideDetail.messages")}
                badge={unreadMessages > 0 ? <Badge tone="alert">{t("escortRideDetail.newBadge", { n: unreadMessages })}</Badge> : null}
              >
                <AssignmentChat
                  assignmentId={myAssignment.id}
                  currentUserId={userId}
                  counterpartyLabel={t("escortRideDetail.counterpartyClient")}
                />
              </AccSection>
            )}

            {!isInvited && !isCompleted && hasDriversOrPlates && (
              <AccSection value="chauffeurs" title={t("escortRideDetail.driversPlates")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-2">{t("escortRideDetail.drivers")}</p>
                    {drivers.length === 0 ? (
                      <p className="text-sm text-brass-deep/80">—</p>
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
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-2">{t("escortRideDetail.plates")}</p>
                    {plates.length === 0 ? (
                      <p className="text-sm text-brass-deep/80">—</p>
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
              </AccSection>
            )}

            {!isInvited && !isCompleted && (
              <AccSection value="medebegeleiders" title={t("escortRideDetail.coEscorts", { n: others.length })}>
                {others.length === 0 ? (
                  <p className="text-sm text-brass-deep/80">{t("escortRideDetail.soleEscort")}</p>
                ) : (
                  <ul className="divide-y divide-brass-deep/10">
                    {others.map((e) => (
                      <li key={e.assignment_id} className="py-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                        <div>
                          <p className="font-medium text-brass-deep">#{e.anonymous_id ?? "—"}</p>
                          <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">
                            {e.status === "accepted" ? t("escortRideDetail.accepted") : e.status}
                          </p>
                        </div>
                        <div className="text-sm">
                          {e.status === "accepted" ? (
                            <>
                              <p className="font-medium">{e.full_name ?? "—"}</p>
                              <p className="text-xs text-brass-deep/80">{e.base_city ?? ""}</p>
                            </>
                          ) : (
                            <p className="text-brass-deep/80 text-xs italic">{t("escortRideDetail.notYetConfirmed")}</p>
                          )}
                        </div>
                        <div className="text-sm">
                          <TelLink phone={e.phone} />
                        </div>
                        <div className="text-xs text-brass-deep/80">{e.vehicle_type ?? ""}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </AccSection>
            )}

            {!isInvited && !isCompleted && (
              <AccSection value="ontheffing" title={t("escortRideDetail.permit")}>
                {permit ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field label={t("escortRideDetail.permitNumber")} value={permit.permit_number} />
                      <Field label={t("escortRideDetail.validFrom")} value={permit.valid_from ?? "—"} />
                      <Field label={t("escortRideDetail.validTo")} value={permit.valid_to ?? "—"} />
                      <div className="md:col-span-2">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">
                          {t("escortRideDetail.maxDims")}
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
                          onClick={() => openPermitPdf(permit.pdf_path!).catch((e) => toast.error(t("escortRideDetail.pdfOpenFail", { e: e?.message ?? e })))}
                          className="inline-block px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
                        >
                          {t("escortRideDetail.openPdf")}
                        </button>
                      )}
                      {permit.permit_number && (
                        <button
                          type="button"
                          onClick={async () => {
                            const tid = toast.loading(t("escortRideDetail.gpxLoading"));
                            try {
                              const { data, error } = await supabase.functions.invoke("fetch-rdw-route", {
                                body: { exemptionId: permit.permit_number },
                              });
                              if (error) throw error;
                              if (!data?.gpx) throw new Error(data?.error ?? t("escortRideDetail.gpxNoData"));
                              const blob = new Blob([data.gpx], { type: "application/gpx+xml" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = data.filename ?? `rdw-route-${permit.permit_number}.gpx`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                              toast.success(t("escortRideDetail.gpxDownloaded", { n: data.points }), { id: tid });
                            } catch (e: any) {
                              toast.error(t("escortRideDetail.gpxFail", { e: e?.message ?? e }), { id: tid });
                            }
                          }}
                          className="inline-block px-6 py-3 border-2 border-brass-deep text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep hover:text-parchment transition-colors"
                        >
                          {t("escortRideDetail.gpxButton")}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-brass-deep/80 mt-2">
                      {t("escortRideDetail.rdwDisclaimer")}
                    </p>
                  </div>
                ) : ride.permit_number ? (
                  <p className="text-sm text-brass-deep/80">{t("escortRideDetail.permitNoDoc", { n: ride.permit_number })}</p>
                ) : (
                  <p className="text-sm text-brass-deep/80">{t("escortRideDetail.noPermit")}</p>
                )}
              </AccSection>
            )}

            {showAnnulering && (
              <AccSection
                value="annulering"
                title={t("escortRideDetail.annuleringTitle")}
                badge={
                  cancelPending
                    ? <Badge tone="info">{t("escortRideDetail.badgePending")}</Badge>
                    : cancelRejected
                      ? <Badge tone="alert">{t("escortRideDetail.badgeRejected")}</Badge>
                      : null
                }
              >
                {myAssignment!.cancel_request_status === "pending" ? (
                  <div className="bg-brass-gold/10 border border-brass-gold/40 p-4 text-sm text-brass-deep">
                    <p className="font-semibold mb-1">{t("escortRideDetail.requestPending")}</p>
                    {myAssignment!.cancel_request_reason && (
                      <p className="italic text-brass-deep/70">"{myAssignment!.cancel_request_reason}"</p>
                    )}
                    <p className="mt-2 text-xs text-brass-deep/80">{t("escortRideDetail.clientMustApprove")}</p>
                  </div>
                ) : myAssignment!.cancel_request_status === "rejected" ? (
                  <div className="bg-red-50 border border-red-200 p-4 text-sm text-red-900 mb-3">
                    {t("escortRideDetail.prevRejected")}
                    <button
                      type="button"
                      onClick={() => setShowCancelForm(true)}
                      className="ml-3 underline font-semibold"
                    >
                      {t("escortRideDetail.reapply")}
                    </button>
                  </div>
                ) : !showCancelForm ? (
                  <>
                    <p className="text-sm text-brass-deep/70 mb-3">
                      {t("escortRideDetail.cancelExplain")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCancelForm(true)}
                      className="px-6 py-3 border border-red-700 text-red-700 uppercase tracking-widest text-xs font-semibold hover:bg-red-700 hover:text-parchment transition-colors"
                    >
                      {t("escortRideDetail.requestCancel")}
                    </button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      placeholder={t("escortRideDetail.cancelReasonPlaceholder")}
                      className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={submitCancelRequest}
                        className="px-5 py-2.5 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold disabled:opacity-50"
                      >
                        {t("escortRideDetail.submitRequest")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCancelForm(false); setCancelReason(""); }}
                        className="px-5 py-2.5 border border-brass-deep/30 uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/5"
                      >
                        {t("escortRideDetail.cancelBack")}
                      </button>
                    </div>
                  </div>
                )}
              </AccSection>
            )}
          </Accordion>
        );
      })()}
    </div>
  );
};

const EscortRideDetail = () => (
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

export default EscortRideDetail;
