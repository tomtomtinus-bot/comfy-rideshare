import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";

const baseSchema = {
  company_name: z.string().trim().min(2, "Bedrijfsnaam is verplicht").max(120),
  billing_contact_name: z.string().trim().min(2, "Contactpersoon is verplicht").max(120),
  billing_email: z.string().trim().email("Ongeldig e-mailadres").max(160),
  billing_address: z.string().trim().min(3, "Vul straat + huisnummer in").max(160),
  billing_postcode: z.string().trim().min(4, "Vul postcode in").max(12),
  billing_city: z.string().trim().min(2, "Vul plaats in").max(80),
  billing_country: z.string().trim().min(2).max(60),
  kvk_number: z.string().trim().min(6, "Ongeldig KvK-nummer").max(20),
  vat_number: z.string().trim().max(30).optional().or(z.literal("")),
};

const clientSchema = z.object(baseSchema);

const escortSchema = z.object({
  ...baseSchema,
  iban: z
    .string()
    .trim()
    .min(15, "Ongeldig IBAN")
    .max(34)
    .regex(/^[A-Z]{2}[0-9A-Z]+$/i, "Ongeldig IBAN-formaat"),
  bank_account_holder: z.string().trim().min(2, "Vul rekeninghouder in").max(120),
});

type FormState = {
  company_name: string;
  billing_contact_name: string;
  billing_email: string;
  billing_address: string;
  billing_postcode: string;
  billing_city: string;
  billing_country: string;
  kvk_number: string;
  vat_number: string;
  iban: string;
  bank_account_holder: string;
};

const empty: FormState = {
  company_name: "",
  billing_contact_name: "",
  billing_email: "",
  billing_address: "",
  billing_postcode: "",
  billing_city: "",
  billing_country: "Nederland",
  kvk_number: "",
  vat_number: "",
  iban: "",
  bank_account_holder: "",
};

const BillingDetailsInner = () => {
  const { user, role } = useAuth();
  const isEscort = role === "begeleider";
  const table = isEscort ? "escort_profiles" : "profiles";

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from(table)
        .select(
          "company_name, billing_contact_name, billing_email, billing_address, billing_postcode, billing_city, billing_country, kvk_number, vat_number" +
            (isEscort ? ", iban, bank_account_holder" : ""),
        )
        .eq("id", user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setForm({
          ...empty,
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ""])),
        } as FormState);
      }
      setLoading(false);
    })();
  }, [user, table, isEscort]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const schema = isEscort ? escortSchema : clientSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        const k = i.path[0] as string;
        if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
      });
      setErrors(fieldErrors);
      toast.error("Controleer de gegevens");
      return;
    }
    setErrors({});
    setSaving(true);
    const payload: Record<string, string | null> = { ...parsed.data };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });
    const { error } = await supabase.from(table).update(payload as never).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Facturatiegegevens opgeslagen");
  };

  const Field = (props: {
    label: string;
    name: keyof FormState;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
  }) => (
    <FieldImpl
      {...props}
      value={form[props.name]}
      error={errors[props.name]}
      onChange={set(props.name)}
    />
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-20 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-3xl mx-auto space-y-10">
          <header>
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
              {isEscort ? "Begeleider" : "Opdrachtgever"}
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">
              Facturatiegegevens
            </h1>
            <p className="text-sm text-brass-deep/60 mt-3">
              Deze gegevens worden gebruikt op alle facturen
              {isEscort ? " en voor uitbetaling van je ritten." : "."}
            </p>
          </header>

          {loading ? (
            <p className="text-sm text-brass-deep/50">Laden…</p>
          ) : (
            <form onSubmit={save} className="bg-card shadow-etched p-6 md:p-8 space-y-8">
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest font-bold text-brass-deep">
                  Bedrijf
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Bedrijfsnaam" name="company_name" autoComplete="organization" />
                  <Field
                    label="Contactpersoon facturen"
                    name="billing_contact_name"
                    autoComplete="name"
                  />
                  <Field
                    label="Factuur-e-mailadres"
                    name="billing_email"
                    type="email"
                    autoComplete="email"
                  />
                  <div />
                  <Field label="KvK-nummer" name="kvk_number" placeholder="12345678" />
                  <Field label="Btw-nummer" name="vat_number" placeholder="NL000000000B01" />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest font-bold text-brass-deep">
                  Factuuradres
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Field
                      label="Straat + huisnummer"
                      name="billing_address"
                      autoComplete="street-address"
                    />
                  </div>
                  <Field label="Postcode" name="billing_postcode" autoComplete="postal-code" />
                  <Field label="Plaats" name="billing_city" autoComplete="address-level2" />
                  <Field label="Land" name="billing_country" autoComplete="country-name" />
                </div>
              </section>

              {isEscort && (
                <section className="space-y-4">
                  <h2 className="text-xs uppercase tracking-widest font-bold text-brass-deep">
                    Uitbetaling
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="IBAN" name="iban" placeholder="NL00BANK0123456789" />
                    <Field label="Rekeninghouder" name="bank_account_holder" />
                  </div>
                </section>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50"
                >
                  {saving ? "Opslaan…" : "Opslaan"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const BillingDetails = () => (
  <RequireAuth>
    <BillingDetailsInner />
  </RequireAuth>
);

export default BillingDetails;
