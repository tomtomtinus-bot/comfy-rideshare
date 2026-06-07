import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, ShieldOff, Plus, Star, Heart, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const REASON_CATEGORIES = [
  "Eerdere negatieve ervaring",
  "Voldoet niet aan interne eisen",
  "Veiligheidsincident",
  "Communicatieproblemen",
  "Overig",
] as const;
type ReasonCategory = (typeof REASON_CATEGORIES)[number];

interface EligibleEscort {
  id: string;
  anonymous_id: string;
  full_name: string | null;
  company_name: string | null;
  base_city: string | null;
  vehicle_type: string;
  interactions: number;
  accepted_count: number;
  last_interaction_at: string | null;
}

interface ExcludedRow {
  id: string;
  escort_id: string;
  reason: string;
  reason_category: string;
  created_at: string;
}
interface FavoriteRow {
  id: string;
  escort_id: string;
  note: string | null;
  created_at: string;
}

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const labelFor = (e: EligibleEscort | undefined) =>
  e?.company_name || e?.full_name || (e ? `Begeleider #${e.anonymous_id}` : "Onbekende begeleider");

const PoolInner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState<EligibleEscort[]>([]);
  const [excluded, setExcluded] = useState<ExcludedRow[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);

  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Per-escort form state for adding to excluded
  const [reasonCat, setReasonCat] = useState<Record<string, ReasonCategory>>({});
  const [reasonDetail, setReasonDetail] = useState<Record<string, string>>({});
  // Per-escort note for favorites
  const [favNote, setFavNote] = useState<Record<string, string>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: el, error: elErr }, { data: ex }, { data: fv }] = await Promise.all([
      supabase.rpc("client_eligible_escorts"),
      supabase
        .from("client_excluded_escorts")
        .select("id, escort_id, reason, reason_category, created_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_favorite_escorts")
        .select("id, escort_id, note, created_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    if (elErr) toast.error("Kon begeleiders niet laden: " + elErr.message);
    setEligible((el as EligibleEscort[]) ?? []);
    setExcluded((ex as ExcludedRow[]) ?? []);
    setFavorites((fv as FavoriteRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const escortMap = useMemo(() => {
    const m = new Map<string, EligibleEscort>();
    eligible.forEach((e) => m.set(e.id, e));
    return m;
  }, [eligible]);

  const excludedIds = useMemo(() => new Set(excluded.map((r) => r.escort_id)), [excluded]);
  const favoriteIds = useMemo(() => new Set(favorites.map((r) => r.escort_id)), [favorites]);

  const q = search.toLowerCase().trim();
  const candidates = useMemo(
    () =>
      eligible
        .filter((e) => !excludedIds.has(e.id) && !favoriteIds.has(e.id))
        .filter((e) => {
          if (!q) return true;
          return (
            (e.full_name ?? "").toLowerCase().includes(q) ||
            (e.company_name ?? "").toLowerCase().includes(q) ||
            (e.anonymous_id ?? "").toLowerCase().includes(q)
          );
        })
        .sort((a, b) =>
          (b.last_interaction_at ?? "").localeCompare(a.last_interaction_at ?? ""),
        ),
    [eligible, excludedIds, favoriteIds, q],
  );

  // ----- Actions -----
  const addExcluded = async (escortId: string) => {
    if (!user) return;
    const cat = reasonCat[escortId];
    const detail = (reasonDetail[escortId] ?? "").trim();
    if (!cat) {
      toast.error("Kies een reden uit de lijst");
      return;
    }
    if (cat === "Overig" && detail.length < 3) {
      toast.error("Geef bij 'Overig' een korte toelichting (min. 3 tekens)");
      return;
    }
    if (detail.length > 500) {
      toast.error("Toelichting is te lang (max 500 tekens)");
      return;
    }
    setBusy(escortId);
    const { error } = await supabase.from("client_excluded_escorts").insert({
      client_id: user.id,
      escort_id: escortId,
      reason_category: cat,
      reason: detail || cat,
    });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Toegevoegd aan uitgesloten lijst");
      setReasonCat((d) => ({ ...d, [escortId]: undefined as any }));
      setReasonDetail((d) => ({ ...d, [escortId]: "" }));
      load();
    }
  };

  const removeExcluded = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from("client_excluded_escorts").delete().eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Verwijderd uit uitgesloten lijst");
      load();
    }
  };

  const addFavorite = async (escortId: string) => {
    if (!user) return;
    const note = (favNote[escortId] ?? "").trim();
    if (note.length > 500) {
      toast.error("Notitie is te lang (max 500 tekens)");
      return;
    }
    setBusy(escortId);
    const { error } = await supabase.from("client_favorite_escorts").insert({
      client_id: user.id,
      escort_id: escortId,
      note: note || null,
    });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Toegevoegd aan favorieten");
      setFavNote((d) => ({ ...d, [escortId]: "" }));
      load();
    }
  };

  const removeFavorite = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.from("client_favorite_escorts").delete().eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Verwijderd uit favorieten");
      load();
    }
  };

  // ----- Render helpers -----
  const Avatar = ({ e }: { e: EligibleEscort | undefined }) => (
    <div className="size-10 bg-patina shadow-etched flex items-center justify-center text-xs font-bold text-brass-deep tabular-nums shrink-0">
      #{e?.anonymous_id ?? "?"}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Nav />
      <main className="flex-1 bg-gradient-hero">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-10 md:py-14">
          <header className="mb-8">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
              Voorkeuren beheren · Privé
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic flex items-center gap-3">
              <Users className="size-8" /> Mijn Begeleiders-pool
            </h1>
            <p className="mt-4 text-sm text-brass-deep/70 max-w-2xl">
              Beheer hier je voorkeuren voor begeleiders waarmee je al eerder
              gewerkt hebt of die op een rit hebben gereageerd. Favorieten worden
              bij nieuwe ritten als eerste benaderd; uitgesloten begeleiders zien
              jouw ritten niet meer. Deze lijsten zijn alleen zichtbaar voor jou
              en de beheerder.
            </p>
          </header>

          <Tabs defaultValue="favorites" className="space-y-6">
            <TabsList className="bg-brass-deep/10">
              <TabsTrigger value="favorites" className="data-[state=active]:bg-brass-deep data-[state=active]:text-parchment">
                <Heart className="size-3.5 mr-1.5" /> Favorieten ({favorites.length})
              </TabsTrigger>
              <TabsTrigger value="excluded" className="data-[state=active]:bg-brass-deep data-[state=active]:text-parchment">
                <ShieldOff className="size-3.5 mr-1.5" /> Uitgesloten ({excluded.length})
              </TabsTrigger>
              <TabsTrigger value="add" className="data-[state=active]:bg-brass-deep data-[state=active]:text-parchment">
                <Plus className="size-3.5 mr-1.5" /> Toevoegen
              </TabsTrigger>
            </TabsList>

            {/* FAVORIETEN */}
            <TabsContent value="favorites" className="bg-card shadow-etched p-6 md:p-8">
              <h2 className="font-display text-xl text-brass-deep mb-4">
                Favoriete begeleiders
              </h2>
              {loading ? (
                <p className="text-sm text-brass-deep/80">Laden…</p>
              ) : favorites.length === 0 ? (
                <p className="text-sm text-brass-deep/80">
                  Nog geen favorieten. Voeg ze toe via het tabblad "Toevoegen".
                </p>
              ) : (
                <ul className="space-y-px bg-brass-deep/10">
                  {favorites.map((row) => {
                    const e = escortMap.get(row.escort_id);
                    return (
                      <li key={row.id} className="bg-card p-4 flex flex-wrap items-start gap-3">
                        <Avatar e={e} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-brass-deep flex items-center gap-1.5">
                            <Star className="size-3.5 fill-brass-gold text-brass-gold" />
                            {labelFor(e)}
                          </p>
                          <p className="text-xs text-brass-deep/80">
                            {e?.base_city ?? "—"}
                            {e?.vehicle_type ? ` · ${e.vehicle_type}` : ""}
                          </p>
                          {row.note && (
                            <p className="text-xs text-brass-deep/80 mt-1 italic">"{row.note}"</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeFavorite(row.id)}
                          disabled={busy === row.id}
                          className="text-[10px] uppercase tracking-widest font-semibold px-3 py-2 border border-brass-deep/20 text-brass-deep hover:bg-brass-deep hover:text-parchment transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Trash2 className="size-3" /> Verwijder
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            {/* UITGESLOTEN */}
            <TabsContent value="excluded" className="bg-card shadow-etched p-6 md:p-8">
              <h2 className="font-display text-xl text-brass-deep mb-4">
                Uitgesloten begeleiders
              </h2>
              {loading ? (
                <p className="text-sm text-brass-deep/80">Laden…</p>
              ) : excluded.length === 0 ? (
                <p className="text-sm text-brass-deep/80">
                  Geen begeleiders uitgesloten.
                </p>
              ) : (
                <ul className="space-y-px bg-brass-deep/10">
                  {excluded.map((row) => {
                    const e = escortMap.get(row.escort_id);
                    return (
                      <li key={row.id} className="bg-card p-4 flex flex-wrap items-start gap-3">
                        <Avatar e={e} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-brass-deep">{labelFor(e)}</p>
                          <p className="text-xs text-brass-deep/80">
                            {e?.base_city ?? "—"}
                            {e?.vehicle_type ? ` · ${e.vehicle_type}` : ""}
                          </p>
                          <p className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/70 mt-1">
                            {row.reason_category}
                          </p>
                          {row.reason && row.reason !== row.reason_category && (
                            <p className="text-xs text-brass-deep/80 mt-1 italic">"{row.reason}"</p>
                          )}
                          <p className="text-[10px] text-brass-deep/80 mt-1">
                            uitgesloten op {fmtDate(row.created_at)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeExcluded(row.id)}
                          disabled={busy === row.id}
                          className="text-[10px] uppercase tracking-widest font-semibold px-3 py-2 border border-brass-deep/20 text-brass-deep hover:bg-brass-deep hover:text-parchment transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Trash2 className="size-3" /> Verwijder
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            {/* TOEVOEGEN */}
            <TabsContent value="add" className="bg-card shadow-etched p-6 md:p-8">
              <h2 className="font-display text-xl text-brass-deep mb-2">
                Begeleider toevoegen
              </h2>
              <p className="text-xs text-brass-deep/80 mb-4">
                Je kunt alleen begeleiders kiezen waarmee je al eerder interactie
                hebt gehad (uitgenodigd, gereageerd of gereden).
              </p>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op naam, bedrijfsnaam of konvooi-ID…"
                maxLength={120}
                className="w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold mb-4"
              />
              {loading ? (
                <p className="text-sm text-brass-deep/80">Laden…</p>
              ) : candidates.length === 0 ? (
                <p className="text-sm text-brass-deep/80">
                  {eligible.length === 0
                    ? "Er zijn nog geen begeleiders waarmee je interactie hebt gehad."
                    : "Geen begeleiders gevonden."}
                </p>
              ) : (
                <ul className="space-y-3">
                  {candidates.slice(0, 50).map((e) => (
                    <li
                      key={e.id}
                      className="bg-parchment/40 border border-brass-deep/10 p-4 flex flex-col gap-3"
                    >
                      <div className="flex flex-wrap items-start gap-3">
                        <Avatar e={e} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-brass-deep">{labelFor(e)}</p>
                          <p className="text-xs text-brass-deep/80">
                            {e.base_city ?? "—"} · {e.vehicle_type}
                          </p>
                          <p className="text-[10px] text-brass-deep/80 mt-1 tabular-nums">
                            {e.interactions} interactie{e.interactions === 1 ? "" : "s"}
                            {e.accepted_count > 0 && ` · ${e.accepted_count} geaccepteerd`}
                            {" · laatste "}
                            {fmtDate(e.last_interaction_at)}
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3">
                        {/* Favoriet */}
                        <div className="bg-card p-3 border border-brass-deep/10">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/70 mb-2 flex items-center gap-1.5">
                            <Heart className="size-3" /> Favoriet maken
                          </p>
                          <input
                            type="text"
                            maxLength={500}
                            value={favNote[e.id] ?? ""}
                            onChange={(ev) =>
                              setFavNote((d) => ({ ...d, [e.id]: ev.target.value }))
                            }
                            placeholder="Notitie (optioneel)"
                            className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-xs focus:outline-none focus:border-brass-gold mb-2"
                          />
                          <button
                            onClick={() => addFavorite(e.id)}
                            disabled={busy === e.id}
                            className="w-full text-[10px] uppercase tracking-widest font-semibold px-3 py-2 bg-brass-gold text-parchment hover:bg-brass-deep transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <Star className="size-3" /> Toevoegen aan favorieten
                          </button>
                        </div>

                        {/* Uitsluiten */}
                        <div className="bg-card p-3 border border-brass-deep/10">
                          <p className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/70 mb-2 flex items-center gap-1.5">
                            <ShieldOff className="size-3" /> Uitsluiten
                          </p>
                          <select
                            value={reasonCat[e.id] ?? ""}
                            onChange={(ev) =>
                              setReasonCat((d) => ({
                                ...d,
                                [e.id]: ev.target.value as ReasonCategory,
                              }))
                            }
                            className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-xs focus:outline-none focus:border-brass-gold mb-2"
                          >
                            <option value="">— Kies een reden —</option>
                            {REASON_CATEGORIES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            maxLength={500}
                            value={reasonDetail[e.id] ?? ""}
                            onChange={(ev) =>
                              setReasonDetail((d) => ({ ...d, [e.id]: ev.target.value }))
                            }
                            placeholder={
                              reasonCat[e.id] === "Overig"
                                ? "Korte toelichting (verplicht)"
                                : "Toelichting (optioneel)"
                            }
                            className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-xs focus:outline-none focus:border-brass-gold mb-2"
                          />
                          <button
                            onClick={() => addExcluded(e.id)}
                            disabled={
                              busy === e.id ||
                              !reasonCat[e.id] ||
                              (reasonCat[e.id] === "Overig" &&
                                (reasonDetail[e.id] ?? "").trim().length < 3)
                            }
                            className="w-full text-[10px] uppercase tracking-widest font-semibold px-3 py-2 bg-brass-deep text-parchment hover:bg-brass-gold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="size-3" /> Uitsluiten
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const ExcludedEscorts = () => (
  <RequireAuth>
    <PoolInner />
  </RequireAuth>
);

export default ExcludedEscorts;
