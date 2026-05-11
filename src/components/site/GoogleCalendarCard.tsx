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

  if (loading) return null;

  if (status.connected) {
    return (
      <div className="flex items-center justify-between gap-3 flex-wrap border border-brass-deep/15 bg-card/60 px-4 py-2.5 mb-6 rounded-sm">
        <div className="flex items-center gap-2 text-[11px] text-brass-deep/70">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-brass-gold shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="font-semibold">Google Agenda</span>
          {status.last_sync_at && (
            <span className="text-brass-deep/45">
              · laatst gesynchroniseerd {new Date(status.last_sync_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => sync(false)}
            disabled={busy !== null}
            className="text-[10px] uppercase tracking-widest font-semibold text-brass-deep/55 hover:text-brass-deep transition-colors disabled:opacity-50"
          >
            {busy === "sync" ? t("google.syncing") : t("google.syncNow")}
          </button>
          <span className="text-brass-deep/20">·</span>
          <button
            type="button"
            onClick={disconnect}
            disabled={busy !== null}
            className="text-[10px] uppercase tracking-widest font-semibold text-brass-deep/45 hover:text-brass-deep transition-colors disabled:opacity-50"
          >
            {busy === "disconnect" ? t("google.disconnecting") : t("google.disconnect")}
          </button>
        </div>
      </div>
    );
  }

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
        </div>
        <button
          type="button"
          onClick={connect}
          disabled={busy !== null}
          className="px-3 py-1.5 border border-brass-deep/25 text-brass-deep uppercase tracking-widest text-[10px] font-semibold hover:bg-parchment transition-colors disabled:opacity-50 shrink-0"
        >
          {busy === "connect" ? t("google.connecting") : t("google.connectGoogle")}
        </button>
      </div>
    </div>
  );
};
