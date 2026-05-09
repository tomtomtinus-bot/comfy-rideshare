import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TokenStatus {
  connected: boolean;
  connected_at?: string | null;
  last_sync_at?: string | null;
}

export const GoogleCalendarCard = () => {
  const [status, setStatus] = useState<TokenStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);

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
    // Process callback redirect params
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "google") {
      if (params.get("ok") === "1") {
        toast.success("Google Agenda gekoppeld");
        // Auto-sync direct na koppelen
        sync(true);
      } else {
        toast.error(`Koppeling mislukt: ${params.get("error") ?? "onbekende fout"}`);
      }
      // Clean URL
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
    const returnTo = `${window.location.origin}/escort-instellingen`;
    const { data, error } = await supabase.functions.invoke("google-oauth-start", {
      body: null,
      method: "GET" as any,
    });
    // Some clients ignore method: fall back to direct fetch with query param
    let url = (data as any)?.url;
    if (!url) {
      const session = (await supabase.auth.getSession()).data.session;
      const r = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth-start?return_to=${encodeURIComponent(returnTo)}`,
        { headers: { Authorization: `Bearer ${session?.access_token ?? ""}` } },
      );
      const j = await r.json();
      url = j.url;
      if (!url) {
        setBusy(null);
        toast.error(j.error ?? "Kon OAuth niet starten");
        return;
      }
    }
    window.location.href = url;
  };

  const sync = async (silent = false) => {
    setBusy("sync");
    const { data, error } = await supabase.functions.invoke("google-calendar-sync");
    setBusy(null);
    if (error) {
      if (!silent) toast.error("Synchroniseren mislukt");
      return;
    }
    if (!silent) {
      const d = data as any;
      toast.success(`Gesynchroniseerd: ${d?.pushed ?? 0} ritten geplaatst, ${d?.removed ?? 0} verwijderd`);
    }
    refresh();
  };

  const disconnect = async () => {
    if (!confirm("Google Agenda loskoppelen? Geplaatste events blijven staan in je agenda.")) return;
    setBusy("disconnect");
    const { error } = await supabase.functions.invoke("google-calendar-disconnect");
    setBusy(null);
    if (error) return toast.error("Loskoppelen mislukt");
    toast.success("Google Agenda losgekoppeld");
    refresh();
  };

  return (
    <div className="bg-card shadow-etched p-6 md:p-8 mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">Integratie</p>
          <h2 className="font-display text-2xl text-brass-deep italic mt-1">Google Agenda</h2>
          <p className="text-[12px] text-brass-deep/70 mt-2 max-w-xl">
            Koppel je Google Agenda zodat geaccepteerde ritten automatisch worden toegevoegd, en bestaande
            agenda-afspraken zichtbaar worden als bezet in je planner (alleen tijden, geen titels).
          </p>
          {!loading && status.connected && (
            <p className="text-[11px] text-brass-deep/60 mt-3">
              Gekoppeld {status.connected_at ? `op ${new Date(status.connected_at).toLocaleDateString("nl-NL")}` : ""}.
              {status.last_sync_at && (
                <> Laatste sync: {new Date(status.last_sync_at).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}.</>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-[180px]">
          {loading ? (
            <p className="text-[11px] text-brass-deep/50">Laden…</p>
          ) : status.connected ? (
            <>
              <button
                type="button"
                onClick={() => sync(false)}
                disabled={busy !== null}
                className="px-4 py-2.5 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50"
              >
                {busy === "sync" ? "Synchroniseren…" : "Nu synchroniseren"}
              </button>
              <button
                type="button"
                onClick={disconnect}
                disabled={busy !== null}
                className="px-4 py-2.5 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-[10px] font-semibold hover:bg-parchment transition-colors disabled:opacity-50"
              >
                {busy === "disconnect" ? "Loskoppelen…" : "Loskoppelen"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={busy !== null}
              className="px-4 py-2.5 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50"
            >
              {busy === "connect" ? "Bezig…" : "Verbinden met Google"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
