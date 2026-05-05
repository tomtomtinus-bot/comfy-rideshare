import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";

interface RideDetail {
  ride: {
    id: string;
    pickup_address: string;
    pickup_city: string;
    dropoff_address: string;
    dropoff_city: string;
    scheduled_at: string;
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
  const [data, setData] = useState<RideDetail | null>(null);
  const [permitUrl, setPermitUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
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
      setLoading(false);
    })();
  }, [id]);

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
        <h1 className="font-display text-3xl md:text-4xl text-brass-deep italic">
          {ride.pickup_city} <span className="text-brass-gold">→</span> {ride.dropoff_city}
        </h1>
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
            {escorts.map((e) => (
              <li key={e.assignment_id} className="py-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
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
              </li>
            ))}
          </ul>
        )}
      </Section>

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
            {permitUrl && (
              <a
                href={permitUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
              >
                PDF openen
              </a>
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
