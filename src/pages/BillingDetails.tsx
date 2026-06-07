import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import { EmailChangeCard } from "@/components/site/EmailChangeCard";
import { AccountDeletionCard } from "@/components/AccountDeletionCard";
import { NotificationPreferencesCard } from "@/components/site/NotificationPreferencesCard";
import { RequireAuth } from "@/components/site/RequireAuth";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const makeSchemas = (t: (k: string) => string) => {
  const baseSchema = {
    company_name: z.string().trim().min(2, t("billing.err.companyName")).max(120),
    billing_contact_name: z.string().trim().min(2, t("billing.err.contact")).max(120),
    billing_email: z.string().trim().email(t("billing.err.email")).max(160),
    billing_address: z.string().trim().min(3, t("billing.err.address")).max(160),
    billing_postcode: z.string().trim().min(4, t("billing.err.postcode")).max(12),
    billing_city: z.string().trim().min(2, t("billing.err.city")).max(80),
    billing_country: z.string().trim().min(2).max(60),
    kvk_number: z.string().trim().min(6, t("billing.err.kvk")).max(20),
    vat_number: z.string().trim().max(30).optional().or(z.literal("")),
  };
  const clientSchema = z.object(baseSchema);
  const escortSchema = z.object({
    ...baseSchema,
    iban: z
      .string()
      .trim()
      .min(15, t("billing.err.iban"))
      .max(34)
      .regex(/^[A-Z]{2}[0-9A-Z]+$/i, t("billing.err.ibanFmt")),
    bank_account_holder: z.string().trim().min(2, t("billing.err.holder")).max(120),
  });
  return { clientSchema, escortSchema };
};

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
  wero_enabled: boolean;
  wero_handle: string;
  wero_fee: string;
  self_billing_mandate: boolean;
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
  wero_enabled: false,
  wero_handle: "",
  wero_fee: "0",
  self_billing_mandate: false,
};

const FieldImpl = ({
  label,
  type = "text",
  placeholder,
  autoComplete,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) => (
  <label className="block">
    <span className="text-sm font-medium text-muted-foreground mb-1.5 block">
      {label}
    </span>
    <Input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoComplete={autoComplete}
    />
    {error && <span className="text-xs text-destructive mt-1.5 block">{error}</span>}
  </label>
);

type ViesResult =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "valid"; name?: string; address?: string }
  | { status: "invalid" }
  | { status: "error"; message: string };

const VatField = ({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) => {
  const { t } = useTranslation();
  const [result, setResult] = useState<ViesResult>({ status: "idle" });

  const check = async () => {
    const v = (value || "").trim();
    if (v.length < 4) {
      setResult({ status: "error", message: t("billingExtra.viesFillFirst") });
      return;
    }
    setResult({ status: "checking" });
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("validate-vat", {
        body: { vat: v },
      });
      if (fnErr) {
        setResult({ status: "error", message: fnErr.message });
        return;
      }
      if (data?.valid) {
        setResult({ status: "valid", name: data.name, address: data.address });
        toast.success(t("billingExtra.viesValidToast"));
      } else if (data?.error === "vies_error") {
        setResult({ status: "error", message: t("billingExtra.viesTempUnavailable") });
      } else {
        setResult({ status: "invalid" });
      }
    } catch (e) {
      setResult({ status: "error", message: e instanceof Error ? e.message : t("billingExtra.viesUnknownError") });
    }
  };

  return (
    <label className="block">
      <span className="text-sm font-medium text-muted-foreground mb-1.5 block">
        {label}
      </span>
      <div className="flex gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e);
            setResult({ status: "idle" });
          }}
          placeholder="NL000000000B01"
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={check}
          disabled={result.status === "checking"}
        >
          {result.status === "checking" ? t("billingExtra.viesBusy") : t("billingExtra.viesCheckBtn")}
        </Button>
      </div>
      {error && <span className="text-xs text-destructive mt-1.5 block">{error}</span>}
      {result.status === "valid" && (
        <div className="mt-2 text-xs bg-green-50 border border-green-300 text-green-900 px-3 py-2 rounded-sm">
          {t("billingExtra.viesValidBox")}
          {result.name ? <div className="mt-1 opacity-80">{result.name}</div> : null}
          {result.address ? <div className="opacity-70 whitespace-pre-line">{result.address}</div> : null}
        </div>
      )}
      {result.status === "invalid" && (
        <div className="mt-2 text-xs bg-red-50 border border-red-300 text-red-900 px-3 py-2 rounded-sm">
          {t("billingExtra.viesInvalidBox")}
        </div>
      )}
      {result.status === "error" && (
        <div className="mt-2 text-xs bg-amber-50 border border-amber-300 text-amber-900 px-3 py-2 rounded-sm">
          {result.message}
        </div>
      )}
    </label>
  );
};

const BillingDetailsInner = () => {
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const isEscort = role === "begeleider";
  const table = isEscort ? "escort_profiles" : "profiles";
  const { clientSchema, escortSchema } = makeSchemas(t);

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initialRef = useRef<FormState>(empty);
  const dirty = !loading && JSON.stringify(form) !== JSON.stringify(initialRef.current);
  useUnsavedChanges(dirty);

  const draftKey = user ? `billing-draft:${user.id}:${table}` : null;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from(table)
        .select(
          "company_name, billing_contact_name, billing_email, billing_address, billing_postcode, billing_city, billing_country, kvk_number, vat_number" +
            (isEscort ? ", iban, bank_account_holder, wero_enabled, wero_handle, wero_fee, self_billing_mandate_accepted_at" : ""),
        )
        .eq("id", user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      let next: FormState = empty;
      if (data) {
        const d = data as unknown as Record<string, unknown>;
        next = {
          ...empty,
          ...Object.fromEntries(
            Object.entries(d).map(([k, v]) => {
              if (k === "wero_enabled") return [k, !!v];
              if (k === "wero_fee") return [k, v == null ? "0" : String(v)];
              if (k === "self_billing_mandate_accepted_at") return ["self_billing_mandate", !!v];
              return [k, v ?? ""];
            }),
          ),
        } as FormState;
      }
      initialRef.current = next;
      // Voorrang voor lokale concept-versie als die bestaat
      let draft: FormState | null = null;
      if (draftKey) {
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) draft = JSON.parse(raw) as FormState;
        } catch { /* ignore */ }
      }
      setForm(draft ? { ...next, ...draft } : next);
      setLoading(false);
    })();
  }, [user, table, isEscort, draftKey]);

  // Bewaar tussentijds als concept zodat ingevulde data behouden blijft bij wegklikken
  useEffect(() => {
    if (loading || !draftKey) return;
    if (JSON.stringify(form) === JSON.stringify(initialRef.current)) {
      localStorage.removeItem(draftKey);
      return;
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify(form));
    } catch { /* ignore */ }
  }, [form, loading, draftKey]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setBool = (k: keyof FormState) => (v: boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

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
      toast.error(t("billing.checkData"));
      return;
    }
    if (isEscort && !form.self_billing_mandate) {
      setErrors({ self_billing_mandate: t("billingExtra.selfBillingRequired") });
      toast.error(t("billingExtra.selfBillingConfirm"));
      return;
    }
    setErrors({});
    setSaving(true);
    const payload: Record<string, string | number | boolean | null> = { ...parsed.data };
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });
    if (isEscort) {
      payload.wero_enabled = !!form.wero_enabled;
      payload.wero_handle = form.wero_handle.trim() || null;
      payload.wero_fee = Number(form.wero_fee || 0);
      payload.self_billing_mandate_accepted_at = form.self_billing_mandate
        ? (initialRef.current.self_billing_mandate
            ? undefined
            : new Date().toISOString())
        : null;
      if (payload.self_billing_mandate_accepted_at === undefined) {
        delete payload.self_billing_mandate_accepted_at;
      }
    }
    const { error } = await supabase.from(table).update(payload as never).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("billing.saved"));
    initialRef.current = form;
    if (draftKey) {
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    }
  };

  const renderField = (props: {
    label: string;
    name: keyof FormState;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
  }) => (
    <FieldImpl
      {...props}
      value={String(form[props.name] ?? "")}
      error={errors[props.name]}
      onChange={set(props.name)}
    />
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead title="Facturatiegegevens | ViaCust" description="Beheer je bedrijfsgegevens, BTW-nummer en factuuradres voor ViaCust." />
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-20 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-3xl mx-auto space-y-10">
          <header>
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
              {isEscort ? t("common.escort") : t("common.client")}
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">
              {t("billing.title")}
            </h1>
            <p className="text-sm text-brass-deep/80 mt-3">
              {t("billing.intro")}
              {isEscort ? t("billing.introEscort") : "."}
            </p>
          </header>

          {loading ? (
            <p className="text-sm text-brass-deep/80">{t("common.loading")}</p>
          ) : (
            <form onSubmit={save} className="bg-card shadow-etched p-6 md:p-8 space-y-8">
              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest font-bold text-brass-deep">
                  {t("billing.company")}
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {renderField({ label: t("billing.f.companyName"), name: "company_name", autoComplete: "organization" })}
                  {renderField({
                    label: t("billing.f.contact"),
                    name: "billing_contact_name",
                    autoComplete: "name",
                  })}
                  {renderField({
                    label: t("billing.f.email"),
                    name: "billing_email",
                    type: "email",
                    autoComplete: "email",
                  })}
                  <div />
                  {renderField({ label: t("billing.f.kvk"), name: "kvk_number", placeholder: "12345678" })}
                  <VatField
                    label={t("billing.f.vat")}
                    value={form.vat_number}
                    onChange={set("vat_number")}
                    error={errors.vat_number}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-xs uppercase tracking-widest font-bold text-brass-deep">
                  {t("billing.address")}
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    {renderField({
                      label: t("billing.f.street"),
                      name: "billing_address",
                      autoComplete: "street-address",
                    })}
                  </div>
                  {renderField({ label: t("billing.f.postcode"), name: "billing_postcode", autoComplete: "postal-code" })}
                  {renderField({ label: t("billing.f.city"), name: "billing_city", autoComplete: "address-level2" })}
                  {renderField({ label: t("billing.f.country"), name: "billing_country", autoComplete: "country-name" })}
                </div>
              </section>

              {isEscort && (
                <section className="space-y-4">
                  <h2 className="text-xs uppercase tracking-widest font-bold text-brass-deep">
                    {t("billing.payout")}
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {renderField({ label: t("billing.f.iban"), name: "iban", placeholder: "NL00BANK0123456789" })}
                    {renderField({ label: t("billing.f.holder"), name: "bank_account_holder" })}
                  </div>
                </section>
              )}

              {isEscort && (
                <section className="space-y-4">
                  <h2 className="text-xs uppercase tracking-widest font-bold text-brass-deep">
                    {t("billing.weroSection")}
                  </h2>
                  <p className="text-xs text-brass-deep/80 -mt-2">
                    {t("billing.weroIntro")}
                  </p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.wero_enabled}
                      onChange={(e) => setBool("wero_enabled")(e.target.checked)}
                      className="h-4 w-4 accent-brass-gold"
                    />
                    <span className="text-sm text-brass-deep">
                      {t("billing.weroToggle")}
                    </span>
                  </label>
                  {form.wero_enabled && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {renderField({
                        label: t("billing.f.weroHandle"),
                        name: "wero_handle",
                        placeholder: "naam@bedrijf.nl of +31612345678",
                      })}
                      {renderField({
                        label: t("billing.f.weroFee"),
                        name: "wero_fee",
                        type: "number",
                        placeholder: "0.50",
                      })}
                    </div>
                  )}
                </section>
              )}

              {isEscort && (
                <section className="space-y-3 border-t border-brass-deep/10 pt-6">
                  <h2 className="text-xs uppercase tracking-widest font-bold text-brass-deep">
                    {t("billingExtra.selfBillingTitle")}
                  </h2>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form.self_billing_mandate}
                      onChange={(e) => setBool("self_billing_mandate")(e.target.checked)}
                      className="h-4 w-4 mt-0.5 accent-brass-gold shrink-0"
                    />
                    <span className="text-sm text-brass-deep/85 leading-relaxed">
                      {t("billingExtra.selfBillingText")}
                    </span>
                  </label>
                  {errors.self_billing_mandate && (
                    <p className="text-xs text-red-700">{errors.self_billing_mandate}</p>
                  )}
                </section>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50"
                >
                  {saving ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </form>
          )}

          <EmailChangeCard />
          <div className="mt-6"><AccountDeletionCard /></div>
          <div className="mt-6"><NotificationPreferencesCard /></div>
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
