import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-12 gap-3 py-2 border-b border-brass-deep/10 text-sm">
    <div className="col-span-5 md:col-span-4 text-brass-deep/55 uppercase tracking-widest text-[10px] font-bold pt-1">
      {label}
    </div>
    <div className="col-span-7 md:col-span-8 break-words">{value ?? "—"}</div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-card shadow-etched p-5 md:p-6">
    <h3 className="font-display text-xl text-brass-deep mb-3">{title}</h3>
    <div>{children}</div>
  </section>
);

const AdminEscortDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [escort, setEscort] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: e, error: eErr }, { data: p, error: pErr }] = await Promise.all([
        supabase.from("escort_profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      ]);
      if (eErr) toast.error(eErr.message);
      if (pErr) toast.error(pErr.message);
      setEscort(e);
      setProfile(p);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="text-sm text-brass-deep/50">Laden…</p>;
  if (!escort) return <p className="text-sm text-brass-deep/50">Begeleider niet gevonden.</p>;

  const surcharges = Array.isArray(escort.surcharges) ? escort.surcharges : [];
  const fuel = escort.fuel_surcharge || {};
  const fuelTiers = Array.isArray(fuel.tiers) ? fuel.tiers : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/admin/escorts"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold"
        >
          <ArrowLeft className="size-4" /> Terug
        </Link>
        <span className={`text-[10px] uppercase tracking-widest font-bold ${escort.available ? "text-brass-gold" : "text-brass-deep/40"}`}>
          {escort.available ? "Beschikbaar" : "Inactief"}
        </span>
      </div>

      <header>
        <h2 className="font-display text-2xl text-brass-deep">
          {profile?.full_name || escort.company_name || "Begeleider"}
        </h2>
        <p className="text-xs text-brass-deep/55 mt-1 tabular-nums">
          #{escort.anonymous_id} · {escort.base_city} · ★ {Number(escort.rating).toFixed(1)} · {escort.rides_completed} ritten
        </p>
      </header>

      <Section title="Persoon & contact">
        <Row label="Volledige naam" value={profile?.full_name} />
        <Row label="Telefoon" value={profile?.phone} />
        <Row label="Anoniem ID" value={`#${escort.anonymous_id}`} />
        <Row label="Goedkeuring" value={profile?.approval_status} />
        <Row label="Goedgekeurd op" value={fmt(profile?.approved_at)} />
        <Row label="Voorwaarden geaccepteerd" value={fmt(profile?.terms_accepted_at)} />
        <Row label="Privacy geaccepteerd" value={fmt(profile?.privacy_accepted_at)} />
        <Row label="Aangemaakt" value={fmt(profile?.created_at)} />
      </Section>

      <Section title="Bedrijf & facturatie">
        <Row label="Bedrijfsnaam" value={escort.company_name} />
        <Row label="KvK" value={escort.kvk_number} />
        <Row label="BTW-nummer" value={escort.vat_number} />
        <Row label="Factuur contact" value={escort.billing_contact_name} />
        <Row label="Factuur e-mail" value={escort.billing_email} />
        <Row label="Adres" value={escort.billing_address} />
        <Row label="Postcode / plaats" value={`${escort.billing_postcode || "—"} ${escort.billing_city || ""}`} />
        <Row label="Land" value={escort.billing_country} />
        <Row label="IBAN" value={escort.iban} />
        <Row label="Rekeninghouder" value={escort.bank_account_holder} />
        <Row label="Self-billing geaccepteerd" value={fmt(escort.self_billing_mandate_accepted_at)} />
      </Section>

      <Section title="Standplaats & voertuig">
        <Row label="Standplaats" value={`${escort.base_address || "—"}, ${escort.base_postcode || ""} ${escort.base_city}`} />
        <Row label="Coördinaten" value={`${escort.base_lat}, ${escort.base_lng}`} />
        <Row label="Voertuig" value={escort.vehicle_type} />
        <Row label="Hoogte-meetstok" value={escort.vehicle_has_height_pole ? "Ja" : "Nee"} />
        <Row label="Zwaailichtbalk" value={escort.vehicle_has_lightbar ? "Ja" : "Nee"} />
        <Row label="Konvooi-bord" value={escort.vehicle_has_konvooi_sign ? "Ja" : "Nee"} />
      </Section>

      <Section title="Certificering">
        <Row label="Certificaatnummer" value={escort.cert_number} />
        <Row label="Verloopt op" value={fmt(escort.cert_expires_on)} />
        <Row label="VCA" value={escort.vca_number} />
        <Row label="Verzekering" value={escort.insurance_policy} />
        <Row label="Certificaatbestanden" value={(escort.certificate_files || []).join(", ") || "—"} />
        <Row label="Geverifieerd in landen" value={(escort.cert_verified_countries || []).join(", ") || "—"} />
      </Section>

      <Section title="Werkgebied & categorieën">
        <Row label="Categorieën" value={(escort.categories || []).join(", ")} />
        <Row label="Type begeleiding" value={(escort.escort_types || []).join(", ")} />
        <Row label="Landen" value={(escort.countries || []).join(", ")} />
        <Row label="Talen" value={(escort.languages || []).join(", ")} />
        <Row label="Klantfilter" value={escort.client_filter_mode} />
      </Section>

      <Section title="Tarieven">
        <Row label="Uurtarief NL" value={`€${Number(escort.hourly_rate).toFixed(2)}`} />
        <Row label="Uurtarief BE" value={`€${Number(escort.hourly_rate_be).toFixed(2)}`} />
        <Row label="Uurtarief DE" value={`€${Number(escort.hourly_rate_de).toFixed(2)}`} />
        <Row label="Uurtarief FR" value={`€${Number(escort.hourly_rate_fr).toFixed(2)}`} />
        <Row label="Uurtarief LU" value={`€${Number(escort.hourly_rate_lu).toFixed(2)}`} />
        <Row label="Min. factureerbare uren" value={escort.min_billable_hours} />
        <Row label="Km-tarief DE" value={escort.km_rate_de ? `€${Number(escort.km_rate_de).toFixed(2)}` : "—"} />
        <Row label="Wero" value={escort.wero_enabled ? `Aan · ${escort.wero_handle || "—"} · €${Number(escort.wero_fee).toFixed(2)}` : "Uit"} />
        <Row
          label="Toeslagen"
          value={
            surcharges.length
              ? <ul className="space-y-1">{surcharges.map((s: any, i: number) => (
                  <li key={i}>{s.label}: <span className="font-semibold">{s.amount}</span></li>
                ))}</ul>
              : "—"
          }
        />
        <Row
          label="Brandstoftoeslag"
          value={
            fuel.enabled
              ? <div>
                  <p>Type: {fuel.kind}</p>
                  {fuelTiers.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {fuelTiers.map((t: any, i: number) => (
                        <li key={i} className="tabular-nums text-xs">vanaf €{t.from}: {t.surcharge}</li>
                      ))}
                    </ul>
                  )}
                </div>
              : "Uit"
          }
        />
      </Section>
    </div>
  );
};

export default AdminEscortDetail;
