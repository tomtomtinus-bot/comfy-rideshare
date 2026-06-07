import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";

interface HistoryRide {
  id: string;
  scheduled_at: string;
  pickup_city: string;
  dropoff_city: string;
  pickup_address?: string;
  dropoff_address?: string;
  amount: number;
  counterpart: string; // anon id of other party
  counterpart_name?: string; // real name (revealed after acceptance)
  invoice_number?: string | null;
  assignment_ids: string[]; // for resolving names
}

const fmtDate = (d: string, lng: string) =>
  new Date(d).toLocaleString(lng === "nl" ? "nl-NL" : lng === "de" ? "de-DE" : lng === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

// ISO week key (YYYY-Www) and human label of the week range
const weekInfo = (iso: string, t: (k: string, v?: any) => string, lng: string) => {
  const d = new Date(iso);
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
  const key = `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;

  const monday = new Date(d);
  const localDay = monday.getDay() || 7;
  monday.setDate(monday.getDate() - (localDay - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const locale = lng === "nl" ? "nl-NL" : lng === "de" ? "de-DE" : lng === "fr" ? "fr-FR" : "en-GB";
  const fmt = (x: Date) => x.toLocaleDateString(locale, { day: "2-digit", month: "short" });
  return { key, label: t("history.weekLabel", { week, from: fmt(monday), to: fmt(sunday), year: tmp.getUTCFullYear() }) };
};

const HistoryInner = () => {
  const { user, role } = useAuth();
  const { t, i18n } = useTranslation();
  const [rides, setRides] = useState<HistoryRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);

      if (role === "begeleider") {
        // Assignments that have been invoiced
        const { data: ass } = await supabase
          .from("ride_assignments")
          .select("id, ride_id, actual_cost, invoiced_at, invoice_id")
          .eq("escort_id", user.id)
          .not("invoiced_at", "is", null);
        const list = ass ?? [];
        const rideIds = [...new Set(list.map((a) => a.ride_id))];
        const invoiceIds = [...new Set(list.map((a) => a.invoice_id).filter(Boolean))] as string[];

        const [{ data: ridesData }, { data: invs }] = await Promise.all([
          rideIds.length
            ? supabase.from("rides").select("id, scheduled_at, pickup_city, dropoff_city, pickup_address, dropoff_address, client_id").in("id", rideIds)
            : Promise.resolve({ data: [] as any[] }),
          invoiceIds.length
            ? supabase.from("invoices").select("id, invoice_number").in("id", invoiceIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const rideMap = new Map((ridesData ?? []).map((r: any) => [r.id, r]));
        const invMap = new Map((invs ?? []).map((i: any) => [i.id, i.invoice_number]));
        const clientIds = [...new Set((ridesData ?? []).map((r: any) => r.client_id))];
        const { data: clients } = clientIds.length
          ? await supabase.from("profiles").select("id, anonymous_id").in("id", clientIds)
          : { data: [] as any[] };
        const clientMap = new Map((clients ?? []).map((c: any) => [c.id, c.anonymous_id]));

        const out: HistoryRide[] = list
          .map((a) => {
            const r: any = rideMap.get(a.ride_id);
            if (!r) return null;
            return {
              id: a.id,
              scheduled_at: r.scheduled_at,
              pickup_city: r.pickup_city,
              dropoff_city: r.dropoff_city,
              pickup_address: r.pickup_address,
              dropoff_address: r.dropoff_address,
              amount: Number(a.actual_cost ?? 0),
              counterpart: `#${clientMap.get(r.client_id) ?? "—"}`,
              invoice_number: a.invoice_id ? invMap.get(a.invoice_id) ?? null : null,
              assignment_ids: [a.id],
            } as HistoryRide;
          })
          .filter(Boolean) as HistoryRide[];
        setRides(out);
      } else {
        // Opdrachtgever: rides linked to a platform invoice
        const { data: ridesData } = await supabase
          .from("rides")
          .select("id, scheduled_at, pickup_city, dropoff_city, pickup_address, dropoff_address, num_escorts, app_fee, platform_invoice_id")
          .eq("client_id", user.id)
          .not("platform_invoice_id", "is", null);
        const list = ridesData ?? [];
        const rideIds = list.map((r) => r.id);
        const invoiceIds = [...new Set(list.map((r: any) => r.platform_invoice_id).filter(Boolean))];
        const [{ data: ass }, { data: invs }] = await Promise.all([
          rideIds.length
            ? supabase.from("ride_assignments").select("id, ride_id, escort_id, actual_cost").in("ride_id", rideIds)
            : Promise.resolve({ data: [] as any[] }),
          invoiceIds.length
            ? supabase.from("platform_invoices").select("id, invoice_number").in("id", invoiceIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);
        const escortIds = [...new Set((ass ?? []).map((a: any) => a.escort_id))];
        const { data: escs } = escortIds.length
          ? await supabase.from("escort_profiles_public").select("id, anonymous_id").in("id", escortIds)
          : { data: [] as any[] };
        const escMap = new Map((escs ?? []).map((e: any) => [e.id, e.anonymous_id]));
        const invMap = new Map((invs ?? []).map((i: any) => [i.id, i.invoice_number]));

        const byRide: Record<string, { total: number; anon: string[]; assignment_ids: string[] }> = {};
        (ass ?? []).forEach((a: any) => {
          (byRide[a.ride_id] ||= { total: 0, anon: [], assignment_ids: [] });
          byRide[a.ride_id].total += Number(a.actual_cost ?? 0);
          byRide[a.ride_id].assignment_ids.push(a.id);
          const an = escMap.get(a.escort_id);
          if (an) byRide[a.ride_id].anon.push(`#${an}`);
        });

        const out: HistoryRide[] = list.map((r: any) => ({
          id: r.id,
          scheduled_at: r.scheduled_at,
          pickup_city: r.pickup_city,
          dropoff_city: r.dropoff_city,
          pickup_address: r.pickup_address,
          dropoff_address: r.dropoff_address,
          amount: (byRide[r.id]?.total ?? 0) + Number(r.app_fee ?? 0),
          counterpart: byRide[r.id]?.anon.join(", ") || "—",
          invoice_number: invMap.get(r.platform_invoice_id) ?? null,
          assignment_ids: byRide[r.id]?.assignment_ids ?? [],
        }));
        setRides(out);
      }

      setLoading(false);
    })();
  }, [user, role]);

  // Resolve real counterparty names (history rows are post-acceptance)
  useEffect(() => {
    (async () => {
      const ids = rides.flatMap((r) => r.assignment_ids).filter(Boolean);
      if (!ids.length) return;
      const results = await Promise.all(
        ids.map(async (id) => {
          const { data } = await supabase.rpc("get_counterparty_name", { _assignment_id: id });
          const row = (data as any[])?.[0];
          return [id, row?.name as string | undefined] as const;
        }),
      );
      const nameById = new Map(results.filter(([, n]) => !!n) as [string, string][]);
      setRides((prev) =>
        prev.map((r) => {
          const names = r.assignment_ids
            .map((id) => nameById.get(id))
            .filter(Boolean) as string[];
          return names.length ? { ...r, counterpart_name: [...new Set(names)].join(", ") } : r;
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rides.length]);

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: HistoryRide[]; total: number }>();
    for (const r of rides) {
      const { key, label } = weekInfo(r.scheduled_at, t, i18n.language);
      if (!map.has(key)) map.set(key, { label, items: [], total: 0 });
      const g = map.get(key)!;
      g.items.push(r);
      g.total += r.amount;
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, v]) => ({ key, ...v, items: v.items.sort((x, y) => +new Date(y.scheduled_at) - +new Date(x.scheduled_at)) }));
  }, [rides, t, i18n.language]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead title="Geschiedenis | ViaCust" description="Bekijk je voltooide transportritten, uren en historische facturen in ViaCust." />
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-20 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-6xl mx-auto space-y-12">
          <header>
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
              {t("history.kicker")}
            </p>
            <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">{t("history.title")}</h1>
            <p className="text-brass-deep/80 mt-3">
              {t("history.intro")}
            </p>
          </header>

          {loading ? (
            <p className="text-sm text-brass-deep/80">{t("common.loading")}</p>
          ) : grouped.length === 0 ? (
            <div className="bg-card shadow-etched p-12 text-center">
              <p className="text-brass-deep/80">{t("history.none")}</p>
            </div>
          ) : (
            <div className="space-y-10">
              {grouped.map((g) => (
                <section key={g.key}>
                  <header className="flex items-end justify-between flex-wrap gap-2 mb-4">
                    <h2 className="font-display text-2xl text-brass-deep">{g.label}</h2>
                    <p className="text-xs uppercase tracking-widest text-brass-deep/80 font-bold tabular-nums">
                      {t("dash.nRidesShort", { count: g.items.length, plural: g.items.length === 1 ? "" : (i18n.language === "nl" ? "ten" : "s") })} · €{g.total.toFixed(2)}
                    </p>
                  </header>
                  <ul className="space-y-px bg-brass-deep/10">
                    {g.items.map((r) => (
                      <li key={r.id} className="bg-card p-6 md:p-8">
                        <div className="grid grid-cols-12 gap-4 items-start">
                          <div className="col-span-12 md:col-span-3">
                            <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">{t("history.date")}</p>
                            <p className="font-medium tabular-nums">{fmtDate(r.scheduled_at, i18n.language)}</p>
                            <p className="text-xs text-brass-deep/80 mt-1">
                              {role === "begeleider" ? t("common.client") : t("common.escort")} {r.counterpart}
                              {r.counterpart_name ? ` · ${r.counterpart_name}` : ""}
                            </p>
                          </div>
                          <div className="col-span-12 md:col-span-6">
                            <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">{t("history.route")}</p>
                            <p className="font-medium">
                              {r.pickup_city} <span className="text-brass-gold mx-2">→</span> {r.dropoff_city}
                            </p>
                            {r.invoice_number && (
                              <p className="text-xs text-brass-deep/80 mt-2">{t("history.invoice", { nr: r.invoice_number })}</p>
                            )}
                          </div>
                          <div className="col-span-12 md:col-span-3 md:text-right">
                            <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">{t("history.amount")}</p>
                            <p className="font-semibold tabular-nums text-brass-gold">
                              €{r.amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const History = () => (
  <RequireAuth>
    <HistoryInner />
  </RequireAuth>
);

export default History;
