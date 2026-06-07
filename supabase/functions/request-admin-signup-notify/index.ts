// Authenticated wrapper that lets a just-signed-up user request an
// admin notification. Derives identity from the caller's JWT instead
// of trusting the request body, then forwards to the service-role-only
// `notify-admins-new-signup` function with the service-role key.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } =
    await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const fullName = typeof body?.fullName === "string"
    ? body.fullName.slice(0, 200)
    : "";
  const phone = typeof body?.phone === "string" ? body.phone.slice(0, 50) : "";
  const role = typeof body?.role === "string" ? body.role.slice(0, 50) : "";
  const companyName = typeof body?.companyName === "string"
    ? body.companyName.slice(0, 200)
    : "";

  // Look up the user's verified email via service role rather than trust body.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const { data: userRecord, error: userErr } =
    await admin.auth.admin.getUserById(userId);
  if (userErr || !userRecord?.user?.email) {
    return new Response(JSON.stringify({ error: "user not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resp = await fetch(
    `${SUPABASE_URL}/functions/v1/notify-admins-new-signup`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        origin: req.headers.get("origin") ?? "",
      },
      body: JSON.stringify({
        userId,
        email: userRecord.user.email,
        fullName,
        phone,
        role,
        companyName,
      }),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    console.error("notify-admins-new-signup forward failed", resp.status, text);
    return new Response(JSON.stringify({ error: "notify failed" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
