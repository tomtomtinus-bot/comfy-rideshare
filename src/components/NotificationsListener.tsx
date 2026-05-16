import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

export function NotificationsListener() {
  const { user } = useAuth();

  // Native push registration (iOS/Android via Capacitor)
  useEffect(() => {
    if (!user) return;
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === "prompt") {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== "granted") return;

        await PushNotifications.register();

        const regHandle = await PushNotifications.addListener("registration", async (token) => {
          await supabase.from("device_push_tokens").upsert(
            {
              user_id: user.id,
              token: token.value,
              platform: Capacitor.getPlatform(),
            },
            { onConflict: "token" }
          );
        });

        const errHandle = await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration error", err);
        });

        const recvHandle = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            toast(notification.title ?? "Melding", { description: notification.body });
          }
        );

        cleanup = () => {
          regHandle.remove();
          errHandle.remove();
          recvHandle.remove();
        };
      } catch (e) {
        console.error("Push setup failed", e);
      }
    })();

    return () => {
      cleanup?.();
    };
  }, [user]);

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

      // Browser push (if permission granted) — web only
      if (
        !Capacitor.isNativePlatform() &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {
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
          if (
            !Capacitor.isNativePlatform() &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(n.title, { body: n.body });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
