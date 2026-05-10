import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { REDIRECT_URI } from "../_shared/google.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const appOrigin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";

  const redirectBack = (path: string, params: Record<string, string>) => {
    // We don't know the app origin here, so respond with HTML that redirects via opener or top-location.
    const target = `${path}?${new URLSearchParams(params).toString()}`;
    const html = `<!doctype html><meta charset="utf-8"><title>Google Agenda</title>
<script>
  try {
    if (window.opener) {
      window.opener.postMessage({ type: 'google-calendar-connected', ok: ${params.ok === "1"} }, '*');
      window.close();
    }
  } catch (e) {}
  window.location.replace(${JSON.stringify(target)});
</script>
<p>Bezig met terugleiden…</p>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  };

  if (error || !code || !state) {
    return redirectBack("/profiel", { ok: "0", error: error ?? "missing_code" });
  }

  let userId = "";
  let returnTo = "/profiel";
  try {
    const decoded = atob(state);
    const [u, r] = decoded.split("|");
    userId = u;
    if (r) returnTo = r;
  } catch {
    return redirectBack("/profiel", { ok: "0", error: "bad_state" });
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });
    const tok = await tokenRes.json();
    if (!tokenRes.ok || !tok.access_token) {
      console.error("Google token exchange failed", tok);
      return redirectBack(returnTo, { ok: "0", error: "token_exchange_failed" });
    }

    const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: upErr } = await admin
      .from("google_calendar_tokens")
      .upsert({
        escort_id: userId,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token, // only present on first consent
        expires_at: expiresAt,
        scope: tok.scope ?? null,
        calendar_id: "primary",
        connected_at: new Date().toISOString(),
      }, { onConflict: "escort_id" });

    if (upErr) {
      console.error("Token upsert failed", upErr);
      return redirectBack(returnTo, { ok: "0", error: "store_failed" });
    }

    return redirectBack(returnTo, { ok: "1", connected: "google" });
  } catch (e) {
    console.error("Callback error", e);
    return redirectBack(returnTo, { ok: "0", error: "exception" });
  }
});
