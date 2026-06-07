import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  id: string;
  client_id: string;
  escort_id: string;
  reason: string | null;
  created_at: string;
}
interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  anonymous_id: string | null;
}
interface Escort {
  id: string;
  anonymous_id: string;
  base_city: string | null;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });

const AdminExcluded = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [clients, setClients] = useState<Record<string, Profile>>({});
  const [escorts, setEscorts] = useState<Record<string, Escort>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"name" | "count" | "recent">("count");

  const load = async () => {
    setLoading(true);
    const { data: ex, error } = await supabase
      .from("client_excluded_escorts")
      .select("id, client_id, escort_id, reason, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (ex as Row[]) ?? [];
    setRows(list);

    const clientIds = Array.from(new Set(list.map((r) => r.client_id)));
    const escortIds = Array.from(new Set(list.map((r) => r.escort_id)));

    const [{ data: profs }, { data: esc }] = await Promise.all([
      clientIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, company_name, anonymous_id")
            .in("id", clientIds)
        : Promise.resolve({ data: [] as Profile[] }),
      escortIds.length
        ? supabase
            .from("escort_profiles")
            .select("id, anonymous_id, base_city")
            .in("id", escortIds)
        : Promise.resolve({ data: [] as Escort[] }),
    ]);

    const cmap: Record<string, Profile> = {};
    ((profs as Profile[]) ?? []).forEach((p) => (cmap[p.id] = p));
    setClients(cmap);
    const emap: Record<string, Escort> = {};
    ((esc as Escort[]) ?? []).forEach((e) => (emap[e.id] = e));
    setEscorts(emap);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Deze uitsluiting verwijderen?")) return;
    const { error } = await supabase
      .from("client_excluded_escorts")
      .delete()
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Verwijderd");
      load();
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, Row[]> = {};
    for (const r of rows) {
      (g[r.client_id] ??= []).push(r);
    }
    let entries = Object.entries(g);
    const q = search.toLowerCase().trim();
    if (q) {
      entries = entries.filter(([cid, list]) => {
        const c = clients[cid];
        if (
          c?.full_name?.toLowerCase().includes(q) ||
          c?.company_name?.toLowerCase().includes(q) ||
          c?.anonymous_id?.toLowerCase().includes(q)
        )
          return true;
        return list.some((r) =>
          escorts[r.escort_id]?.anonymous_id?.toLowerCase().includes(q),
        );
      });
    }
    entries.sort(([a, la], [b, lb]) => {
      if (sortBy === "count") return lb.length - la.length;
      if (sortBy === "recent") {
        const ta = Math.max(...la.map((r) => +new Date(r.created_at)));
        const tb = Math.max(...lb.map((r) => +new Date(r.created_at)));
        return tb - ta;
      }
      const na = (clients[a]?.company_name || clients[a]?.full_name || "").toLowerCase();
      const nb = (clients[b]?.company_name || clients[b]?.full_name || "").toLowerCase();
      return na.localeCompare(nb);
    });
    return entries;
  }, [rows, clients, escorts, search, sortBy]);

  const toggle = (cid: string) => {
    setOpen((s) => {
      const n = new Set(s);
      n.has(cid) ? n.delete(cid) : n.add(cid);
      return n;
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl text-brass-deep flex items-center gap-2">
          <ShieldOff className="size-6" /> Uitgesloten begeleiders
        </h2>
        <p className="text-sm text-brass-deep/80 mt-1">
          {rows.length} uitsluiting{rows.length === 1 ? "" : "en"} verdeeld over{" "}
          {Object.keys(clients).length} opdrachtgever
          {Object.keys(clients).length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op opdrachtgever, bedrijf of begeleider-ID…"
          className="flex-1 bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
        />
        <div className="flex gap-1 bg-brass-deep/10 p-1">
          {(["count", "recent", "name"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSortBy(k)}
              className={`text-[10px] uppercase tracking-widest font-bold px-3 py-2 ${sortBy === k ? "bg-brass-deep text-parchment" : "text-brass-deep hover:bg-parchment"}`}
            >
              {k === "count" ? "Aantal" : k === "recent" ? "Recent" : "Naam"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-brass-deep/80">Laden…</p>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-brass-deep/80">Geen uitsluitingen gevonden.</p>
      ) : (
        <ul className="space-y-px bg-brass-deep/10">
          {grouped.map(([cid, list]) => {
            const c = clients[cid];
            const isOpen = open.has(cid);
            return (
              <li key={cid} className="bg-card">
                <button
                  onClick={() => toggle(cid)}
                  className="w-full flex items-center justify-between p-4 hover:bg-parchment/40 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium text-brass-deep">
                      {c?.company_name || c?.full_name || "Onbekende opdrachtgever"}
                    </p>
                    <p className="text-xs text-brass-deep/80">
                      {c?.full_name && c?.company_name ? c.full_name + " · " : ""}
                      {c?.anonymous_id ? `#${c.anonymous_id}` : cid.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 bg-brass-deep text-parchment">
                      {list.length} uitgesloten
                    </span>
                    <ChevronDown
                      className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>
                {isOpen && (
                  <ul className="border-t border-brass-deep/10">
                    {list.map((r) => {
                      const e = escorts[r.escort_id];
                      return (
                        <li
                          key={r.id}
                          className="p-4 pl-6 border-b border-brass-deep/5 last:border-0 flex flex-wrap items-start gap-3 bg-parchment/30"
                        >
                          <div className="size-9 bg-patina shadow-etched flex items-center justify-center text-xs font-bold text-brass-deep tabular-nums">
                            #{e?.anonymous_id ?? "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brass-deep">
                              Begeleider #{e?.anonymous_id ?? "onbekend"}
                            </p>
                            <p className="text-xs text-brass-deep/80">
                              {e?.base_city ?? "—"} · uitgesloten op {fmt(r.created_at)}
                            </p>
                            {r.reason && (
                              <p className="text-xs text-brass-deep/80 mt-1 italic">
                                "{r.reason}"
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => remove(r.id)}
                            className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-red-700/40 text-red-700 hover:bg-red-50"
                          >
                            Verwijder
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AdminExcluded;
