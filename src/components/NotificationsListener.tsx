import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function NotificationsListener() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Show any unread notifications on mount
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body")
        .eq("user_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      data?.forEach((n) => toast(n.title, { description: n.body }));
      if (data && data.length > 0) {
        await supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .in("id", data.map((n) => n.id));
      }

      // Browser push (if permission granted)
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    })();

    const channel = supabase
      .channel("notifications-" + user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const n = payload.new as { id: string; title: string; body: string };
          toast(n.title, { description: n.body });
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(n.title, { body: n.body });
          }
          await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("id", n.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
