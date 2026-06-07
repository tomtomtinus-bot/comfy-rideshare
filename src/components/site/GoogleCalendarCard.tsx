import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface TokenStatus {
  connected: boolean;
  connected_at?: string | null;
  last_sync_at?: string | null;
}

const localeMap: Record<string, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE", fr: "fr-FR" };

export const GoogleCalendarCard = () => {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<TokenStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const locale = localeMap[i18n.resolvedLanguage ?? "nl"] ?? "nl-NL";

  const refresh = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("google_calendar_tokens")
      .select("connected_at, last_sync_at")
      .eq("escort_id", user.id)
      .maybeSingle();
    setStatus({
      connected: !!data,
      connected_at: data?.connected_at,
      last_sync_at: data?.last_sync_at,
    });
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "google") {
      if (params.get("ok") === "1") {
        toast.success(t("google.googleConnected"));
        sync(true);
      } else {
        toast.error(t("google.couplingFail", { error: params.get("error") ?? t("google.unknownError") }));
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      url.searchParams.delete("ok");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setBusy("connect");
    const returnTo = `${window.location.origin}/profiel`;
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      setBusy(null);
      return toast.error(t("demo.notLoggedIn"));
    }
    try {
      const r = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-start?return_to=${encodeURIComponent(returnTo)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const j = await r.json();
      if (!j.url) {
        setBusy(null);
        return toast.error(j.error ?? t("google.oauthFail"));
      }
      window.location.href = j.url;
    } catch (e) {
      setBusy(null);
      toast.error(t("google.oauthFail"));
    }
  };

  const sync = async (silent = false) => {
    setBusy("sync");
    const { data, error } = await supabase.functions.invoke("google-calendar-sync");
    setBusy(null);
    if (error) {
      if (!silent) toast.error(t("google.syncFail"));
      return;
    }
    if (!silent) {
      const d = data as any;
      toast.success(t("google.syncSuccess", { pushed: d?.pushed ?? 0, removed: d?.removed ?? 0 }));
    }
    refresh();
  };

  const disconnect = async () => {
    if (!confirm(t("google.disconnectConfirm"))) return;
    setBusy("disconnect");
    const { error } = await supabase.functions.invoke("google-calendar-disconnect");
    setBusy(null);
    if (error) return toast.error(t("google.disconnectFail"));
    toast.success(t("google.disconnected"));
    refresh();
  };

  if (loading) return null;

  if (status.connected) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-between gap-3 flex-wrap py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500 shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="font-medium text-foreground">Google Agenda</span>
            {status.last_sync_at && (
              <span>
                · laatst gesynchroniseerd {new Date(status.last_sync_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => sync(false)}
              disabled={busy !== null}
            >
              {busy === "sync" ? "Synchroniseren…" : "Nu Synchroniseren"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnect}
              disabled={busy !== null}
            >
              {busy === "disconnect" ? "Loskoppelen…" : "Loskoppelen"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="flex items-start justify-between gap-4 flex-wrap py-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Google Agenda</p>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            {t("google.cardBody")}
          </p>
          <p className="text-xs text-amber-600 mt-1.5 font-medium">
            Let op: zorg dat je browser pop-ups van deze site toestaat.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={connect}
          disabled={busy !== null}
        >
          {busy === "connect" ? t("google.connecting") : t("google.connectGoogle")}
        </Button>
      </CardContent>
    </Card>
  );
};
