import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { REDIRECT_URI, SCOPES } from "../_shared/google.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
    if (!clientId) {
      return new Response(JSON.stringify({ error: "GOOGLE_OAUTH_CLIENT_ID niet geconfigureerd" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const returnTo = url.searchParams.get("return_to") ?? "/escort-instellingen";

    // State = base64(user.id|returnTo)
    const state = btoa(`${user.id}|${returnTo}`);

    const oauth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    oauth.searchParams.set("client_id", clientId);
    oauth.searchParams.set("redirect_uri", REDIRECT_URI);
    oauth.searchParams.set("response_type", "code");
    oauth.searchParams.set("scope", SCOPES);
    oauth.searchParams.set("access_type", "offline");
    oauth.searchParams.set("prompt", "consent");
    oauth.searchParams.set("state", state);
    oauth.searchParams.set("include_granted_scopes", "true");

    return new Response(JSON.stringify({ url: oauth.toString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
