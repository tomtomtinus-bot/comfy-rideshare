import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, ShieldOff, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";

interface EscortRow {
  id: string;
  anonymous_id: string;
  base_city: string | null;
  countries: string[];
  vehicle_type: string;
}

interface ExcludedRow {
  id: string;
  escort_id: string;
  reason: string | null;
  created_at: string;
  escort: EscortRow | null;
}

const ExcludedEscortsInner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [excluded, setExcluded] = useState<ExcludedRow[]>([]);
  const [escorts, setEscorts] = useState<EscortRow[]>([]);
  const [search, setSearch] = useState("");
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: ex }, { data: es }] = await Promise.all([
      supabase
        .from("client_excluded_escorts")
        .select("id, escort_id, reason, created_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("escort_profiles")
        .select("id, anonymous_id, base_city, countries, vehicle_type")
        .order("anonymous_id", { ascending: true }),
    ]);
    const escortsList = (es as EscortRow[]) ?? [];
    setEscorts(escortsList);
    const map = new Map(escortsList.map((e) => [e.id, e]));
    setExcluded(
      ((ex as any[]) ?? []).map((r) => ({
        ...r,
        escort: map.get(r.escort_id) ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const excludedIds = new Set(excluded.map((r) => r.escort_id));
  const q = search.toLowerCase().trim();
  const candidates = escorts.filter(
    (e) =>
      !excludedIds.has(e.id) &&
      (q === "" ||
        e.anonymous_id?.toLowerCase().includes(q) ||
        (e.base_city ?? "").toLowerCase().includes(q)),
  );

  const add = async (escortId: string) => {
    if (!user) return;
    const reason = (reasonDraft[escortId] ?? "").trim();
    if (reason.length < 3) {
      toast.error("Geef een korte reden op (min. 3 tekens)");
      return;
    }
    if (reason.length > 500) {
      toast.error("Reden is te lang (max 500 tekens)");
      return;
    }
    setBusy(escortId);
    const { error } = await supabase.from("client_excluded_escorts").insert({
      client_id: user.id,
      escort_id: escortId,
      reason,
    });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Begeleider toegevoegd aan blacklist");
      setReasonDraft((d) => ({ ...d, [escortId]: "" }));
      load();
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from("client_excluded_escorts")
      .delete()
      .eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Verwijderd uit blacklist");
      load();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Nav />
      <main className="flex-1 bg-gradient-hero">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-10 md:py-14">
          <header className="mb-8">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
              Privé · Alleen jij en de admin
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic flex items-center gap-3">
              <ShieldOff className="size-8" /> Begeleidersfilter
            </h1>
            <p className="mt-4 text-sm text-brass-deep/70 max-w-2xl">
              Begeleiders op deze lijst worden bij toekomstige opdrachten niet
              uitgenodigd. Deze lijst is privé: alleen jij en de beheerder kunnen
              hem zien. Begeleiders worden hier nooit van op de hoogte gesteld.
            </p>
          </header>

          <section className="bg-card shadow-etched p-6 md:p-8 mb-8">
            <h2 className="font-display text-xl text-brass-deep mb-4">
              Uitgesloten ({excluded.length})
            </h2>
            {loading ? (
              <p className="text-sm text-brass-deep/50">Laden…</p>
            ) : excluded.length === 0 ? (
              <p className="text-sm text-brass-deep/50">
                Je hebt nog geen begeleiders uitgesloten.
              </p>
            ) : (
              <ul className="space-y-px bg-brass-deep/10">
                {excluded.map((row) => (
                  <li
                    key={row.id}
                    className="bg-card p-4 flex flex-wrap items-start gap-3"
                  >
                    <div className="size-10 bg-patina shadow-etched flex items-center justify-center text-xs font-bold text-brass-deep tabular-nums">
                      #{row.escort?.anonymous_id ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-brass-deep">
                        Begeleider #{row.escort?.anonymous_id ?? "onbekend"}
                      </p>
                      <p className="text-xs text-brass-deep/60">
                        {row.escort?.base_city ?? "—"}
                        {row.escort?.vehicle_type ? ` · ${row.escort.vehicle_type}` : ""}
                      </p>
                      {row.reason && (
                        <p className="text-xs text-brass-deep/80 mt-1 italic">
                          "{row.reason}"
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => remove(row.id)}
                      disabled={busy === row.id}
                      className="text-[10px] uppercase tracking-widest font-semibold px-3 py-2 border border-brass-deep/20 text-brass-deep hover:bg-brass-deep hover:text-parchment transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Trash2 className="size-3" /> Verwijder
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-card shadow-etched p-6 md:p-8">
            <h2 className="font-display text-xl text-brass-deep mb-4">
              Begeleider toevoegen
            </h2>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek op konvooi-ID of standplaats…"
              className="w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold mb-4"
            />
            {loading ? (
              <p className="text-sm text-brass-deep/50">Laden…</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-brass-deep/50">
                Geen begeleiders gevonden.
              </p>
            ) : (
              <ul className="space-y-px bg-brass-deep/10 max-h-[480px] overflow-auto">
                {candidates.slice(0, 50).map((e) => (
                  <li
                    key={e.id}
                    className="bg-card p-4 flex flex-wrap items-start gap-3"
                  >
                    <div className="size-10 bg-patina shadow-etched flex items-center justify-center text-xs font-bold text-brass-deep tabular-nums">
                      #{e.anonymous_id}
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-medium text-brass-deep">
                        Begeleider #{e.anonymous_id}
                      </p>
                      <p className="text-xs text-brass-deep/60">
                        {e.base_city ?? "—"} · {e.vehicle_type}
                      </p>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={500}
                      value={reasonDraft[e.id] ?? ""}
                      onChange={(ev) =>
                        setReasonDraft((d) => ({ ...d, [e.id]: ev.target.value }))
                      }
                      placeholder="Reden (verplicht, alleen voor jou en admin)"
                      className="flex-1 min-w-[180px] bg-parchment border border-brass-deep/15 px-3 py-2 text-xs focus:outline-none focus:border-brass-gold"
                    />
                    <button
                      onClick={() => add(e.id)}
                      disabled={busy === e.id || (reasonDraft[e.id] ?? "").trim().length < 3}
                      className="text-[10px] uppercase tracking-widest font-semibold px-3 py-2 bg-brass-deep text-parchment hover:bg-brass-gold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="size-3" /> Uitsluiten
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

const ExcludedEscorts = () => (
  <RequireAuth>
    <ExcludedEscortsInner />
  </RequireAuth>
);

export default ExcludedEscorts;
