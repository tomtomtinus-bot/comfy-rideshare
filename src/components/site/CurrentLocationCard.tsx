import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DURATIONS = [2, 4, 8, 12];

type CurrentLocation = {
  current_lat: number | null;
  current_lng: number | null;
  current_address: string | null;
  current_until: string | null;
};

const localeMap: Record<string, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE", fr: "fr-FR" };

export default function CurrentLocationCard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "nl").slice(0, 2);
  const locale = localeMap[lang] ?? "nl-NL";
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loc, setLoc] = useState<CurrentLocation | null>(null);
  const [hours, setHours] = useState(8);
  const [, force] = useState(0);

  const isActive = loc?.current_until && new Date(loc.current_until).getTime() > Date.now();

  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("escort_profiles")
        .select("current_lat, current_lng, current_address, current_until")
        .eq("id", user.id)
        .maybeSingle();
      setLoc((data ?? null) as CurrentLocation | null);
      setLoading(false);
    })();
  }, [user]);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const { data } = await supabase.functions.invoke("google-geocode", {
        body: { lat, lng },
      });
      return (data?.formatted_address as string) ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const setHere = () => {
    if (!user) return;
    if (!("geolocation" in navigator)) {
      return toast.error(t("standplaats.geoUnsupported"));
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await reverseGeocode(lat, lng);
        const until = new Date(Date.now() + hours * 3600_000).toISOString();
        const { error } = await supabase
          .from("escort_profiles")
          .update({
            current_lat: lat,
            current_lng: lng,
            current_address: address,
            current_until: until,
          })
          .eq("id", user.id);
        setBusy(false);
        if (error) return toast.error(error.message);
        setLoc({ current_lat: lat, current_lng: lng, current_address: address, current_until: until });
        toast.success(t("standplaats.setForHours", { hours }));
      },
      (err) => {
        setBusy(false);
        toast.error(err.code === err.PERMISSION_DENIED
          ? t("standplaats.geoDenied")
          : t("standplaats.geoFailed"));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  const clearHere = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("escort_profiles")
      .update({ current_lat: null, current_lng: null, current_address: null, current_until: null })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setLoc(null);
    toast.success(t("standplaats.cleared"));
  };

  if (loading) return null;

  return (
    <Card className="p-5 border-input">
      <div className="flex items-start gap-3 mb-4">
        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("standplaats.currentTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            <Trans
              i18nKey="standplaats.currentDesc"
              components={{ 1: <strong />, 2: <em /> }}
            />
          </p>
        </div>
      </div>

      {isActive ? (
        <div className="space-y-3">
          <div className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
            <p className="text-foreground font-medium">📍 {loc?.current_address ?? t("standplaats.currentLocation")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("standplaats.activeUntil", {
                when: new Date(loc!.current_until!).toLocaleString(locale, {
                  weekday: "short", hour: "2-digit", minute: "2-digit",
                }),
              })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button type="button" size="sm" variant="outline" onClick={setHere} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("standplaats.refresh")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={clearHere} disabled={busy}>
              {t("standplaats.clear")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            {t("standplaats.validFor")}
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="border border-input bg-background rounded-md px-2 py-1.5 text-sm"
            >
              {DURATIONS.map((h) => (
                <option key={h} value={h}>{t("standplaats.hours", { n: h })}</option>
              ))}
            </select>
          </label>
          <Button type="button" size="sm" onClick={setHere} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {t("standplaats.iAmHere")}
          </Button>
        </div>
      )}
    </Card>
  );
}
