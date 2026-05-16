// Sends webpush notifications via VAPID to subscriptions in push_subscriptions.
// Body: { userIds?: string[], userId?: string, title: string, body: string, url?: string, tag?: string }
// Also handles GET to return the VAPID public key (so the frontend can subscribe).

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:info@viacust.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    console.error("[send-push] VAPID setup failed", e);
  }
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method === "GET") {
    return new Response(JSON.stringify({ publicKey: VAPID_PUBLIC }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { userIds, userId, title, body, url, tag } = await req.json();
    const ids: string[] = Array.isArray(userIds) ? userIds : userId ? [userId] : [];
    if (ids.length === 0 || !title) {
      return new Response(JSON.stringify({ error: "userIds/userId and title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = admin();
    const { data: subs, error } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .in("user_id", ids);
    if (error) throw error;

    const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/", tag });
    let sent = 0;
    let removed = 0;
    const removeIds: string[] = [];

    await Promise.all((subs ?? []).map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        const status = e?.statusCode;
        if (status === 404 || status === 410) {
          removeIds.push(s.id);
        } else {
          console.error(`[send-push] error for ${s.endpoint.slice(0, 40)}: ${status} ${e?.body ?? e?.message}`);
        }
      }
    }));

    if (removeIds.length) {
      await db.from("push_subscriptions").delete().in("id", removeIds);
      removed = removeIds.length;
    }

    return new Response(JSON.stringify({ sent, removed, total: subs?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-push]", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
