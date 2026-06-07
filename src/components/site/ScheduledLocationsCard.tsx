import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CalendarClock, Loader2, Trash2, Plus } from "lucide-react";
import { AddressAutocomplete, type AddressResult } from "@/components/site/AddressAutocomplete";
import { useTranslation, Trans } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ScheduledLocation = {
  id: string;
  address: string;
  lat: number;
  lng: number;
  start_at: string;
  end_at: string;
  note: string | null;
};

const isoLocal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const localeMap: Record<string, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE", fr: "fr-FR" };

export default function ScheduledLocationsCard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "nl").slice(0, 2);
  const locale = localeMap[lang] ?? "nl-NL";
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ScheduledLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [addr, setAddr] = useState<AddressResult | null>(null);
  const [addrText, setAddrText] = useState("");
  const [startAt, setStartAt] = useState(isoLocal(new Date(Date.now() + 24 * 3600_000)));
  const [endAt, setEndAt] = useState(isoLocal(new Date(Date.now() + 32 * 3600_000)));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("escort_scheduled_locations")
        .select("id, address, lat, lng, start_at, end_at, note")
        .eq("escort_id", user.id)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true });
      if (!error) setRows((data ?? []) as ScheduledLocation[]);
      setLoading(false);
    })();
  }, [user]);

  const resetForm = () => {
    setAddr(null); setAddrText(""); setNote("");
    setStartAt(isoLocal(new Date(Date.now() + 24 * 3600_000)));
    setEndAt(isoLocal(new Date(Date.now() + 32 * 3600_000)));
  };

  const add = async () => {
    if (!user) return;
    if (!addr) return toast.error(t("standplaats.pickAddress"));
    const s = new Date(startAt).getTime();
    const e = new Date(endAt).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e)) return toast.error(t("standplaats.fillTimes"));
    if (e <= s) return toast.error(t("standplaats.endAfterStart"));
    setBusy(true);
    const { data, error } = await supabase
      .from("escort_scheduled_locations")
      .insert({
        escort_id: user.id,
        address: addr.address || addr.display,
        lat: addr.lat,
        lng: addr.lng,
        start_at: new Date(s).toISOString(),
        end_at: new Date(e).toISOString(),
        note: note.trim() || null,
      })
      .select("id, address, lat, lng, start_at, end_at, note")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setRows((r) => [...r, data as ScheduledLocation].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    setShowForm(false);
    resetForm();
    toast.success(t("standplaats.saved"));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("escort_scheduled_locations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  if (loading) return null;

  const fmt = (s: string) => new Date(s).toLocaleString(locale, {
    weekday: "short", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <Card className="p-5 border-input">
      <div className="flex items-start gap-3 mb-4">
        <CalendarClock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{t("standplaats.scheduledTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            <Trans i18nKey="standplaats.scheduledDesc" components={{ 1: <strong /> }} />
          </p>
        </div>
      </div>

      {rows.length > 0 && (
        <ul className="space-y-2 mb-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm flex items-start justify-between gap-3">
              <div>
                <p className="text-foreground font-medium">📍 {r.address}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fmt(r.start_at)} — {fmt(r.end_at)}
                </p>
                {r.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{r.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(r.id)}
                className="text-muted-foreground hover:text-foreground p-1"
                title={t("standplaats.delete")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showForm ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("standplaats.addLocation")}
        </Button>
      ) : (
        <div className="space-y-3 border-t border-input pt-4">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">{t("standplaats.location")}</label>
            <AddressAutocomplete
              label=""
              value={addrText}
              onChange={(v) => setAddrText(v)}
              onSelect={(r) => { setAddr(r); setAddrText(r.display); }}
              placeholder={t("standplaats.searchPh")}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground block">
              <span className="block mb-1 font-medium text-foreground">{t("standplaats.from")}</span>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full border border-input bg-background rounded-md px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-muted-foreground block">
              <span className="block mb-1 font-medium text-foreground">{t("standplaats.to")}</span>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full border border-input bg-background rounded-md px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <label className="text-xs text-muted-foreground block">
            <span className="block mb-1 font-medium text-foreground">{t("standplaats.note")}</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("standplaats.notePh")}
              className="w-full border border-input bg-background rounded-md px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={add} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t("standplaats.save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowForm(false); resetForm(); }} disabled={busy}>
              {t("standplaats.cancel")}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
