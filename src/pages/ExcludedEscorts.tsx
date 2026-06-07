import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Trash2,
  ShieldOff,
  Plus,
  Star,
  Heart,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  // ----- Shared table cell renderer -----
  const escortLabel = (e: EligibleEscort | undefined) => (
    <div className="max-w-[200px]">
      <p className="font-medium truncate text-xs">{labelFor(e)}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Nav />
      <main className="flex-1 bg-gradient-hero">
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-10 md:py-14">
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
            <TabsContent value="favorites" className="space-y-4">
              <div className="border border-border rounded-md bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Anoniem ID</TableHead>
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Naam / Bedrijf</TableHead>
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Standplaats</TableHead>
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Voertuig</TableHead>
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Notitie</TableHead>
                      <TableHead className="h-9 w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Laden…</TableCell>
                      </TableRow>
                    ) : favorites.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nog geen favorieten. Voeg ze toe via het tabblad "Toevoegen".</TableCell>
                      </TableRow>
                    ) : (
                      favorites.map((row) => {
                        const e = escortMap.get(row.escort_id);
                        return (
                          <TableRow key={row.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-xs font-semibold tabular-nums py-2">
                              #{e?.anonymous_id ?? "?"}
                            </TableCell>
                            <TableCell className="py-2">{escortLabel(e)}</TableCell>
                            <TableCell className="text-xs py-2 whitespace-nowrap">{e?.base_city ?? "—"}</TableCell>
                            <TableCell className="text-xs py-2 whitespace-nowrap">{e?.vehicle_type ?? "—"}</TableCell>
                            <TableCell className="text-xs py-2 max-w-[200px] truncate italic text-muted-foreground">
                              {row.note || "—"}
                            </TableCell>
                            <TableCell className="py-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Meer opties</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs">
                                    {labelFor(e)}
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-xs text-destructive focus:text-destructive"
                                    onClick={() => removeFavorite(row.id)}
                                  >
                                    <Trash2 className="size-3 mr-1.5" />
                                    Verwijderen
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* UITGESLOTEN */}
            <TabsContent value="excluded" className="space-y-4">
              <div className="border border-border rounded-md bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Anoniem ID</TableHead>
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Naam / Bedrijf</TableHead>
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Standplaats</TableHead>
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Voertuig</TableHead>
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Reden</TableHead>
                      <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Uitgesloten op</TableHead>
                      <TableHead className="h-9 w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Laden…</TableCell>
                      </TableRow>
                    ) : excluded.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Geen begeleiders uitgesloten.</TableCell>
                      </TableRow>
                    ) : (
                      excluded.map((row) => {
                        const e = escortMap.get(row.escort_id);
                        return (
                          <TableRow key={row.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-xs font-semibold tabular-nums py-2">
                              #{e?.anonymous_id ?? "?"}
                            </TableCell>
                            <TableCell className="py-2">{escortLabel(e)}</TableCell>
                            <TableCell className="text-xs py-2 whitespace-nowrap">{e?.base_city ?? "—"}</TableCell>
                            <TableCell className="text-xs py-2 whitespace-nowrap">{e?.vehicle_type ?? "—"}</TableCell>
                            <TableCell className="text-xs py-2 max-w-[240px]">
                              <span className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground block">{row.reason_category}</span>
                              {row.reason && row.reason !== row.reason_category && (
                                <span className="italic text-muted-foreground">&ldquo;{row.reason}&rdquo;</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums py-2 whitespace-nowrap">{fmtDate(row.created_at)}</TableCell>
                            <TableCell className="py-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Meer opties</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="text-xs">
                                    {labelFor(e)}
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-xs text-destructive focus:text-destructive"
                                    onClick={() => removeExcluded(row.id)}
                                  >
                                    <Trash2 className="size-3 mr-1.5" />
                                    Uitsluiting opheffen
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TOEVOEGEN */}
            <TabsContent value="add" className="bg-card shadow-etched p-6 md:p-8 space-y-4">
              <h2 className="font-display text-xl text-brass-deep">
                Begeleider toevoegen
              </h2>
              <p className="text-xs text-brass-deep/80">
                Je kunt alleen begeleiders kiezen waarmee je al eerder interactie
                hebt gehad (uitgenodigd, gereageerd of gereden).
              </p>
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op naam, bedrijfsnaam of konvooi-ID…"
                className="h-9"
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
                <div className="border border-border rounded-md bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Anoniem ID</TableHead>
                        <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Naam / Bedrijf</TableHead>
                        <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Standplaats</TableHead>
                        <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Voertuig</TableHead>
                        <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Interacties</TableHead>
                        <TableHead className="h-9 w-[180px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {candidates.slice(0, 50).map((e) => (
                        <TableRow key={e.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-semibold tabular-nums py-2">
                            #{e.anonymous_id}
                          </TableCell>
                          <TableCell className="py-2">
                            <p className="font-medium truncate text-xs">{labelFor(e)}</p>
                          </TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{e.base_city ?? "—"}</TableCell>
                          <TableCell className="text-xs py-2 whitespace-nowrap">{e.vehicle_type}</TableCell>
                          <TableCell className="text-xs tabular-nums py-2 whitespace-nowrap">
                            {e.interactions} interactie{e.interactions === 1 ? "" : "s"}
                            {e.accepted_count > 0 && ` · ${e.accepted_count} geaccepteerd`}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex flex-col gap-2">
                              {/* Favoriet */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  maxLength={500}
                                  value={favNote[e.id] ?? ""}
                                  onChange={(ev) =>
                                    setFavNote((d) => ({ ...d, [e.id]: ev.target.value }))
                                  }
                                  placeholder="Notitie (optioneel)"
                                  className="flex-1 bg-parchment border border-brass-deep/15 px-2 py-1.5 text-[11px] focus:outline-none focus:border-brass-gold"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => addFavorite(e.id)}
                                  disabled={busy === e.id}
                                  className="h-7 text-[10px] bg-brass-gold text-parchment hover:bg-brass-deep whitespace-nowrap"
                                >
                                  <Star className="size-3 mr-1" /> Favoriet
                                </Button>
                              </div>
                              {/* Uitsluiten */}
                              <div className="flex items-center gap-2">
                                <select
                                  value={reasonCat[e.id] ?? ""}
                                  onChange={(ev) =>
                                    setReasonCat((d) => ({
                                      ...d,
                                      [e.id]: ev.target.value as ReasonCategory,
                                    }))
                                  }
                                  className="flex-1 bg-parchment border border-brass-deep/15 px-2 py-1.5 text-[11px] focus:outline-none focus:border-brass-gold"
                                >
                                  <option value="">— Kies een reden —</option>
                                  {REASON_CATEGORIES.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  size="sm"
                                  onClick={() => addExcluded(e.id)}
                                  disabled={
                                    busy === e.id ||
                                    !reasonCat[e.id] ||
                                    (reasonCat[e.id] === "Overig" &&
                                      (reasonDetail[e.id] ?? "").trim().length < 3)
                                  }
                                  className="h-7 text-[10px] bg-brass-deep text-parchment hover:bg-brass-gold whitespace-nowrap"
                                >
                                  <ShieldOff className="size-3 mr-1" /> Uitsluiten
                                </Button>
                              </div>
                              {reasonCat[e.id] === "Overig" && (
                                <input
                                  type="text"
                                  maxLength={500}
                                  value={reasonDetail[e.id] ?? ""}
                                  onChange={(ev) =>
                                    setReasonDetail((d) => ({ ...d, [e.id]: ev.target.value }))
                                  }
                                  placeholder="Korte toelichting (verplicht)"
                                  className="w-full bg-parchment border border-brass-deep/15 px-2 py-1.5 text-[11px] focus:outline-none focus:border-brass-gold"
                                />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
