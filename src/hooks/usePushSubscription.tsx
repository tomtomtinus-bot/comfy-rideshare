import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Status = "unsupported" | "blocked" | "denied" | "default" | "subscribed";

const isIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const isPreviewHost = typeof window !== "undefined" && (
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com")
);

const canUsePush =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  !isIframe &&
  !isPreviewHost;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushSubscription() {
  const [status, setStatus] = useState<Status>("default");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!canUsePush) { setStatus("unsupported"); return; }
    const perm = Notification.permission;
    if (perm === "denied") { setStatus("blocked"); return; }
    const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
    const existing = await reg?.pushManager.getSubscription();
    if (existing && perm === "granted") setStatus("subscribed");
    else if (perm === "granted") setStatus("default");
    else setStatus("default");
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const enable = useCallback(async () => {
    if (!canUsePush) return;
    setBusy(true);
    try {
      const { data: pk } = await supabase.functions.invoke("send-push", { method: "GET" as any });
      const publicKey = (pk as any)?.publicKey as string | undefined;
      if (!publicKey) throw new Error("Geen VAPID public key beschikbaar.");

      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setStatus(perm === "denied" ? "blocked" : "denied"); return; }

      const reg = await navigator.serviceWorker.register("/sw-push.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = sub.toJSON() as any;
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Niet ingelogd.");

      await supabase.from("push_subscriptions").upsert({
        user_id: auth.user.id,
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        user_agent: navigator.userAgent,
        last_used_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });

      setStatus("subscribed");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    if (!canUsePush) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("default");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable, supported: canUsePush };
}
