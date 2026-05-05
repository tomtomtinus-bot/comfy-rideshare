import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EscortRow {
  id: string;
  company_name: string | null;
  base_city: string;
  hourly_rate: number;
  rating: number;
  rides_completed: number;
  available: boolean;
  cert_expires_on: string | null;
  cert_number: string | null;
  vca_number: string | null;
  anonymous_id: string;
  full_name?: string;
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const AdminEscorts = () => {
  const [list, setList] = useState<EscortRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("escort_profiles")
      .select("id, company_name, base_city, hourly_rate, rating, rides_completed, available, cert_expires_on, cert_number, vca_number, anonymous_id")
      .order("rating", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const ids = (data ?? []).map((e: any) => e.id);
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as any[] };
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    setList(((data ?? []) as any[]).map((e) => ({ ...e, full_name: pMap.get(e.id) })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAvailable = async (id: string, available: boolean) => {
    const { error } = await supabase.from("escort_profiles").update({ available }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(available ? "Begeleider geactiveerd" : "Begeleider gedeactiveerd");
      load();
    }
  };

  const expired = (d: string | null) => d && new Date(d) < new Date();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl text-brass-deep">Begeleiders</h2>
        <p className="text-sm text-brass-deep/60 mt-1">
          {list.length} profiel{list.length === 1 ? "" : "en"} · modereer beschikbaarheid en certificering.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-brass-deep/50">Laden…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-brass-deep/50">Geen begeleiders.</p>
      ) : (
        <ul className="space-y-px bg-brass-deep/10">
          {list.map((e) => (
            <li key={e.id} className="bg-card p-4 md:p-5">
              <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-12 md:col-span-4">
                  <p className="font-medium">{e.full_name || e.company_name || "—"}</p>
                  <p className="text-[10px] text-brass-deep/55 mt-1 tabular-nums">
                    #{e.anonymous_id} · {e.base_city}
                  </p>
                  {e.company_name && e.full_name && (
                    <p className="text-[10px] text-brass-deep/45 mt-1">{e.company_name}</p>
                  )}
                </div>
                <div className="col-span-6 md:col-span-3 text-xs">
                  <p className="text-brass-deep/55">Tarief</p>
                  <p className="tabular-nums">€{Number(e.hourly_rate).toFixed(2)}/u</p>
                  <p className="mt-2 text-brass-deep/55">Ritten</p>
                  <p className="tabular-nums">{e.rides_completed} · ★ {Number(e.rating).toFixed(1)}</p>
                </div>
                <div className="col-span-6 md:col-span-3 text-xs">
                  <p className="text-brass-deep/55">Certificaat</p>
                  <p className="tabular-nums">
                    {e.cert_number || "—"}
                    {e.cert_expires_on && (
                      <span className={`block text-[10px] ${expired(e.cert_expires_on) ? "text-red-700 font-bold" : "text-brass-deep/55"}`}>
                        Verloopt {fmt(e.cert_expires_on)}
                        {expired(e.cert_expires_on) ? " (verlopen!)" : ""}
                      </span>
                    )}
                  </p>
                  {e.vca_number && <p className="mt-1 text-[10px] text-brass-deep/55">VCA {e.vca_number}</p>}
                </div>
                <div className="col-span-12 md:col-span-2 md:text-right space-y-2">
                  <p className={`text-[10px] uppercase tracking-widest font-bold ${e.available ? "text-brass-gold" : "text-brass-deep/40"}`}>
                    {e.available ? "Beschikbaar" : "Inactief"}
                  </p>
                  <button
                    onClick={() => toggleAvailable(e.id, !e.available)}
                    className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-brass-deep/20 text-brass-deep hover:bg-parchment"
                  >
                    {e.available ? "Deactiveer" : "Activeer"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminEscorts;
