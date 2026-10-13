// Emails the planner when an escort submits a ride ticket (respects profiles.email_preferences.ticket_submitted).
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendAppEmail } from "../_shared/transactional-email-templates/send-app-email.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Unauthorized" }, 401);
  const { assignmentId } = await req.json().catch(() => ({}));
  if (!assignmentId || typeof assignmentId !== "string") return json({ error: "assignmentId required" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: a } = await admin.from("ride_assignments").select("id, ride_id, escort_id, ticket_status, actual_cost, hours_submitted_at").eq("id", assignmentId).maybeSingle();
  if (!a || a.escort_id !== u.user.id || !["submitted", "approved"].includes(a.ticket_status)) return json({ error: "Not allowed" }, 403);
  const { data: ride } = await admin.from("rides").select("id, client_id, pickup_city, pickup_address, dropoff_city, dropoff_address, scheduled_at, client_reference, permit_number").eq("id", a.ride_id).maybeSingle();
  if (!ride) return json({ ok: true, skipped: "no ride" });
  const { data: prof } = await admin.from("profiles").select("full_name, company_name, email_preferences").eq("id", ride.client_id).maybeSingle();
  if ((prof as any)?.email_preferences?.ticket_submitted === false) return json({ ok: true, skipped: "opted out" });
  const { data: cu } = await admin.auth.admin.getUserById(ride.client_id);
  const email = cu?.user?.email;
  if (!email) return json({ ok: true, skipped: "no email" });
  const { data: ep } = await admin.from("profiles").select("full_name, company_name").eq("id", a.escort_id).maybeSingle();
  const amount = typeof a.actual_cost === "number" ? `€ ${a.actual_cost.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
  const res = await sendAppEmail({
    templateName: "ticket-submitted-client",
    recipientEmail: email,
    idempotencyKey: `ticket-${a.id}-${a.hours_submitted_at ?? Date.now()}`,
    templateData: {
      clientName: (prof as any)?.full_name ?? "",
      escortName: (ep as any)?.company_name || (ep as any)?.full_name || "",
      amount,
      pickup: ride.pickup_address || ride.pickup_city || "",
      dropoff: ride.dropoff_address || ride.dropoff_city || "",
      plannedAt: ride.scheduled_at ? new Date(ride.scheduled_at).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Amsterdam" }) : "",
      reference: ride.client_reference || ride.permit_number || "",
      rideUrl: "https://viacust.com/dashboard",
    },
  });
  return json({ ok: true, res });
});
