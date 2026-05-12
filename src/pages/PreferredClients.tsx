import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Building2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";

type Mode = "all" | "only" | "except";

interface EligibleClient {
  id: string;
  anonymous_id: string;
  company_name: string | null;
  billing_city: string | null;
  interactions: number;
  accepted_count: number;
  last_interaction_at: string | null;
}

interface PreferredRow {
  id: string;
  client_id: string;
  anonymous_id: string;
  company_name: string | null;
  billing_city: string | null;
  note: string | null;
  created_at: string;
}

const labelFor = (
  c: { company_name: string | null; anonymous_id: string } | undefined,
) => c?.company_name || (c ? `Opdrachtgever #${c.anonymous_id}` : "Onbekend");

const Inner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [savingMode, setSavingMode] = useState(false);

  const [mode, setMode] = useState<Mode>("all");
  const [eligible, setEligible] = useState<EligibleClient[]>([]);
  const [preferred, setPreferred] = useState<PreferredRow[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: el }, { data: pf }] = await Promise.all([
      supabase
        .from("escort_profiles")
        .select("client_filter_mode")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.rpc("escort_eligible_clients"),
      supabase.rpc("escort_preferred_client_details"),
    ]);
    setMode(((prof as any)?.client_filter_mode ?? "all") as Mode);
    setEligible((el as EligibleClient[]) ?? []);
    setPreferred((pf as PreferredRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const preferredIds = useMemo(
    () => new Set(preferred.map((r) => r.client_id)),
    [preferred],
  );

  const q = search.toLowerCase().trim();
  const candidates = useMemo(
    () =>
      eligible
        .filter((e) => !preferredIds.has(e.id))
        .filter((e) => {
          if (!q) return true;
          return (
            (e.company_name ?? "").toLowerCase().includes(q) ||
            (e.anonymous_id ?? "").toLowerCase().includes(q) ||
            (e.billing_city ?? "").toLowerCase().includes(q)
          );
        }),
    [eligible, preferredIds, q],
  );

  const updateMode = async (next: Mode) => {
    if (!user || next === mode) return;
    setSavingMode(true);
    const { error } = await supabase
      .from("escort_profiles")
      .update({ client_filter_mode: next })
      .eq("id", user.id);
    setSavingMode(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMode(next);
    toast.success("Voorkeur opgeslagen");
  };

  const addClient = async (clientId: string) => {
    if (!user) return;
    setBusy(clientId);
    const { error } = await supabase
      .from("escort_preferred_clients")
      .insert({ escort_id: user.id, client_id: clientId });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Toegevoegd aan lijst");
      load();
    }
  };

  const removeClient = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from("escort_preferred_clients")
      .delete()
      .eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Verwijderd uit lijst");
      load();
    }
  };

  const listTitle =
    mode === "only"
      ? "Geselecteerde opdrachtgevers (zichtbaar)"
      : mode === "except"
        ? "Uitgesloten opdrachtgevers (verborgen)"
        : "Mijn lijst";

  const listHelp =
    mode === "all"
      ? "Je ziet ritten van alle opdrachtgevers. Kies hieronder een andere modus om een lijst te gebruiken."
      : mode === "only"
        ? "Je ziet alleen ritten van de opdrachtgevers in deze lijst."
        : "Je ziet ritten van iedereen behalve deze opdrachtgevers.";

  const ModeOption = ({
    value,
    title,
    desc,
  }: {
    value: Mode;
    title: string;
    desc: string;
  }) => {
    const active = mode === value;
    return (
      <button
        type="button"
        disabled={savingMode}
        onClick={() => updateMode(value)}
        className={`text-left p-4 border-2 transition-all ${
          active
            ? "border-brass-gold bg-brass-gold/10 shadow-etched"
            : "border-brass-deep/15 bg-card hover:border-brass-deep/40"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`size-4 rounded-full border-2 mt-1 shrink-0 ${
              active
                ? "border-brass-gold bg-brass-gold"
                : "border-brass-deep/40"
            }`}
          />
          <div>
            <p className="font-semibold text-brass-deep">{title}</p>
            <p className="text-sm text-brass-deep/70 mt-1">{desc}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Nav />
      <main className="flex-1 bg-gradient-hero">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-10 md:py-14">
          <header className="mb-8">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
              Voorkeuren begeleider · Privé
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic flex items-center gap-3">
              <Building2 className="size-8" /> Mijn Voorkeursopdrachtgevers
            </h1>
            <p className="mt-4 text-sm text-brass-deep/70 max-w-2xl">
              Bepaal van welke opdrachtgevers je ritten wilt ontvangen. Deze
              instelling is alleen zichtbaar voor jou en de beheerder, en wordt
              automatisch toegepast bij nieuwe ritten.
            </p>
          </header>

          {/* Mode selection */}
          <section className="bg-card shadow-etched p-6 md:p-8 mb-8">
            <h2 className="font-display text-xl text-brass-deep mb-4">
              Filtermodus
            </h2>
            <div className="grid md:grid-cols-3 gap-3">
              <ModeOption
                value="all"
                title="Open (standaard)"
                desc="Ik wil ritten van alle opdrachtgevers zien."
              />
              <ModeOption
                value="only"
                title="Exclusief"
                desc="Ik wil alleen ritten zien van geselecteerde opdrachtgevers."
              />
              <ModeOption
                value="except"
                title="Filter"
                desc="Toon alle ritten, behalve van deze specifieke bedrijven."
              />
            </div>
          </section>

          {/* List management */}
          <section className="bg-card shadow-etched p-6 md:p-8 mb-8">
            <h2 className="font-display text-xl text-brass-deep mb-2">
              {listTitle}
            </h2>
            <p className="text-sm text-brass-deep/60 mb-5">{listHelp}</p>

            {loading ? (
              <p className="text-sm text-brass-deep/50">Laden…</p>
            ) : preferred.length === 0 ? (
              <p className="text-sm text-brass-deep/50">
                Nog geen opdrachtgevers in je lijst.
                {mode === "all"
                  ? " Voeg ze hieronder toe."
                  : " Voeg er hieronder een toe om de filter actief te maken."}
              </p>
            ) : (
              <ul className="space-y-px bg-brass-deep/10">
                {preferred.map((row) => (
                  <li
                    key={row.id}
                    className="bg-card p-4 flex flex-wrap items-start gap-3"
                  >
                    <div className="size-10 bg-patina shadow-etched flex items-center justify-center text-xs font-bold text-brass-deep tabular-nums shrink-0">
                      #{row.anonymous_id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-brass-deep">
                        {labelFor(row)}
                      </p>
                      <p className="text-xs text-brass-deep/60">
                        {row.billing_city ?? "—"}
                      </p>
                    </div>
                    <button
                      onClick={() => removeClient(row.id)}
                      disabled={busy === row.id}
                      className="text-xs uppercase tracking-widest font-bold text-red-700 hover:text-red-900 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" /> Verwijderen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Add clients */}
          <section className="bg-card shadow-etched p-6 md:p-8">
            <h2 className="font-display text-xl text-brass-deep mb-4 flex items-center gap-2">
              <Plus className="size-5" /> Opdrachtgevers toevoegen
            </h2>
            <p className="text-sm text-brass-deep/60 mb-4">
              Hier zie je opdrachtgevers waarmee je eerder ritten hebt gehad.
            </p>

            <div className="relative mb-4">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-brass-deep/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op naam, ID of plaats…"
                className="w-full pl-10 pr-3 py-2.5 bg-parchment border border-brass-deep/20 text-sm focus:outline-none focus:border-brass-gold"
              />
            </div>

            {loading ? (
              <p className="text-sm text-brass-deep/50">Laden…</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-brass-deep/50">
                {eligible.length === 0
                  ? "Nog geen eerdere opdrachtgevers."
                  : "Geen opdrachtgevers gevonden."}
              </p>
            ) : (
              <ul className="space-y-px bg-brass-deep/10">
                {candidates.map((c) => (
                  <li
                    key={c.id}
                    className="bg-card p-4 flex flex-wrap items-start gap-3"
                  >
                    <div className="size-10 bg-patina shadow-etched flex items-center justify-center text-xs font-bold text-brass-deep tabular-nums shrink-0">
                      #{c.anonymous_id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-brass-deep">
                        {labelFor(c)}
                      </p>
                      <p className="text-xs text-brass-deep/60">
                        {c.billing_city ?? "—"} · {c.interactions} contact
                        {c.interactions === 1 ? "" : "en"} ·{" "}
                        {c.accepted_count} geaccepteerd
                      </p>
                    </div>
                    <button
                      onClick={() => addClient(c.id)}
                      disabled={busy === c.id}
                      className="text-xs uppercase tracking-widest font-bold text-brass-deep hover:text-brass-gold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="size-3.5" /> Toevoegen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const PreferredClients = () => (
  <RequireAuth>
    <Inner />
  </RequireAuth>
);

export default PreferredClients;
