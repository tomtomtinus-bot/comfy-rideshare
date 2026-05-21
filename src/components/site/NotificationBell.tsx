import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { nl, enGB, de, fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const dfLocale: Record<string, typeof nl> = { nl, en: enGB, de, fr };


type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  ride_assignment_id: string | null;
  ride_id: string | null;
  read_at: string | null;
  created_at: string;
};

const PAGE = 15;

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || "nl").slice(0, 2);
  const fnsLoc = dfLocale[lang] ?? nl;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);


  const openNotification = async (n: Notification) => {
    setOpen(false);
    if (!n.read_at) void markOneRead(n.id);

    // Escort viewing their own assignment → open assignment detail
    if (n.ride_assignment_id) {
      const { data } = await supabase
        .from("ride_assignments")
        .select("ride_id, escort_id")
        .eq("id", n.ride_assignment_id)
        .maybeSingle();
      if (user && data?.escort_id === user.id) {
        navigate(`/opdracht/${n.ride_assignment_id}`);
        return;
      }
      if (data?.ride_id) {
        navigate(`/rit/${data.ride_id}`);
        return;
      }
    }

    if (n.ride_id) {
      navigate(`/rit/${n.ride_id}`);
    }
  };

  const unread = items.filter((n) => !n.read_at).length;

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,type,ride_assignment_id,ride_id,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    setItems((data as Notification[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    load();

    const channel = supabase
      .channel("notif-bell-" + user.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setItems((cur) => [payload.new as Notification, ...cur].slice(0, PAGE))
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) =>
          setItems((cur) =>
            cur.map((n) => (n.id === (payload.new as Notification).id ? (payload.new as Notification) : n))
          )
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = async () => {
    if (!user) return;
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    setItems((cur) => cur.map((n) => (ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  };

  const markOneRead = async (id: string) => {
    setItems((cur) => cur.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  const clearAll = async () => {
    if (!user || items.length === 0) return;
    if (!window.confirm(t("notifBell.confirmClear"))) return;
    const ids = items.map((n) => n.id);
    setItems([]);
    await supabase.from("notifications").delete().in("id", ids);
  };

  if (!user) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("notifBell.ariaLabel")}
        aria-expanded={open}
        className="relative p-2 border border-brass-deep/20 text-brass-deep hover:bg-brass-deep hover:text-parchment transition-colors"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brass-gold text-parchment text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-[5.25rem] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[340px] sm:max-w-[calc(100vw-2rem)] bg-parchment border border-brass-deep/15 shadow-etched z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brass-deep/10">
            <p className="text-xs uppercase tracking-widest font-bold text-brass-deep">{t("notifBell.title")}</p>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] uppercase tracking-widest font-semibold text-brass-deep/70 hover:text-brass-gold inline-flex items-center gap-1"
                >
                  <CheckCheck className="size-3.5" /> {t("notifBell.markAllRead")}
                </button>
              )}
              {items.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[11px] uppercase tracking-widest font-semibold text-brass-deep/70 hover:text-destructive inline-flex items-center gap-1"
                >
                  <Trash2 className="size-3.5" /> {t("notifBell.clear")}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-brass-deep/60">{t("notifBell.loading")}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-brass-deep/60 text-center">{t("notifBell.empty")}</p>
            ) : (
              <ul className="divide-y divide-brass-deep/10">
                {items.map((n) => {
                  const clickable = !!(n.ride_assignment_id || n.ride_id);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => (clickable ? openNotification(n) : !n.read_at && markOneRead(n.id))}
                      >
                        <div
                          className={cn(
                            "px-4 py-3 hover:bg-brass-deep/[0.04] transition-colors",
                            !n.read_at && "bg-brass-gold/[0.07]"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {!n.read_at && (
                              <span className="mt-1.5 size-2 rounded-full bg-brass-gold shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-brass-deep truncate">{n.title}</p>
                              <p className="text-xs text-brass-deep/70 line-clamp-2 mt-0.5">{n.body}</p>
                              <p className="text-[10px] uppercase tracking-widest text-brass-deep/40 mt-1">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fnsLoc })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
