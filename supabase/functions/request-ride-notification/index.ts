// Authenticated client-facing wrapper that forwards a limited set of
// ride-event notifications to the internal service-role-only
// `notify-ride-event` function. This exists so the underlying notifier
// can stay locked down to service-role callers while still letting
// legitimate, authenticated users trigger their own ride/escort events.

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

const ALLOWED_EVENTS = new Set(["ride_updated", "escort_cancelled"]);

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
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
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
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { event, rideId, summary, reason, escortUserId } = body ?? {};
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return new Response(JSON.stringify({ error: "event not allowed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!rideId || typeof rideId !== "string") {
    return new Response(JSON.stringify({ error: "rideId required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Ownership / involvement check using service role.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: ride, error: rideErr } = await admin
    .from("rides")
    .select("id, client_id")
    .eq("id", rideId)
    .maybeSingle();
  if (rideErr || !ride) {
    return new Response(JSON.stringify({ error: "ride not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Admins may always trigger.
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  let allowed = isAdmin === true;
  const payload: Record<string, unknown> = { event, rideId };

  if (event === "ride_updated") {
    if (ride.client_id === userId) allowed = true;
    if (typeof summary === "string") payload.summary = summary.slice(0, 500);
  } else if (event === "escort_cancelled") {
    // Caller must be the escort cancelling their own assignment.
    if (escortUserId && escortUserId !== userId) {
      // Don't let one escort spoof another.
      allowed = isAdmin === true;
    } else {
      // Verify caller actually has an assignment on this ride.
      const { data: assignment } = await admin
        .from("ride_assignments")
        .select("id")
        .eq("ride_id", rideId)
        .eq("escort_user_id", userId)
        .maybeSingle();
      if (assignment) allowed = true;
    }
    payload.escortUserId = userId;
    if (typeof reason === "string") payload.reason = reason.slice(0, 1000);
  }

  if (!allowed) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Forward to internal notifier with service-role authorization.
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/notify-ride-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("notify-ride-event forward failed", resp.status, text);
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
