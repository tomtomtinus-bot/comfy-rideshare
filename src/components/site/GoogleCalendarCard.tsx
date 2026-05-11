import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <div className="border border-brass-deep/15 bg-card/60 p-4 md:p-5 mb-6 rounded-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-brass-deep/45 font-semibold">
            {t("google.integration")}
          </p>
          <h3 className="font-display text-base text-brass-deep mt-0.5">Google Agenda</h3>
          <p className="text-[11px] text-brass-deep/55 mt-1.5 max-w-xl leading-relaxed">
            {t("google.cardBody")}
          </p>
          {!loading && status.connected && (
            <p className="text-[10px] text-brass-deep/45 mt-2">
              {t("google.connectedOn", {
                date: status.connected_at ? t("google.onDate", { date: new Date(status.connected_at).toLocaleDateString(locale) }) : "",
              })}
              {status.last_sync_at && (
                <>{t("google.lastSync", { date: new Date(status.last_sync_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" }) })}</>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loading ? (
            <p className="text-[10px] text-brass-deep/40">{t("google.loading")}</p>
          ) : status.connected ? (
            <>
              <button
                type="button"
                onClick={() => sync(false)}
                disabled={busy !== null}
                className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold transition-colors disabled:opacity-50"
              >
                {busy === "sync" ? t("google.syncing") : t("google.syncNow")}
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={busy !== null}
                className="px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold text-brass-deep/55 hover:text-brass-deep transition-colors disabled:opacity-50"
              >
                {busy === "disconnect" ? t("google.disconnecting") : t("google.disconnect")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={busy !== null}
              className="px-3 py-1.5 border border-brass-deep/25 text-brass-deep uppercase tracking-widest text-[10px] font-semibold hover:bg-parchment transition-colors disabled:opacity-50"
            >
              {busy === "connect" ? t("google.connecting") : t("google.connectGoogle")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
