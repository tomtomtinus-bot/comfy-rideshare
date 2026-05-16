// Dispatches transactional email notifications for ride lifecycle events.
// Centralises the logic so triggers (close-ride-broadcasts, EditRide, escort
// cancellation, generate-invoice-pdf, payments-webhook) can just fire an
// event and let this function resolve recipients + templateData.
//
// Body: { event, rideId?, assignmentId?, escortUserId?, summary?, reason?, invoiceId?, paymentEvent? }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_ORIGIN = "https://viacust.com";

function getAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })
    : "";

const fmtMoney = (n: number | null | undefined) =>
  typeof n === "number"
    ? `€ ${n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "";

async function getUserEmail(admin: ReturnType<typeof getAdmin>, userId: string): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

async function getAdminEmails(admin: ReturnType<typeof getAdmin>): Promise<string[]> {
  const { data: roleRows } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const ids = new Set((roleRows ?? []).map((r: any) => r.user_id));
  if (ids.size === 0) return [];
  const emails: string[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const u of data.users) {
      if (u.email && ids.has(u.id)) emails.push(u.email);
    }
    if (data.users.length < 200) break;
    page++;
    if (page > 20) break;
  }
  return emails;
}

async function loadRide(admin: ReturnType<typeof getAdmin>, rideId: string) {
  const { data } = await admin
    .from("rides")
    .select("id, client_id, pickup_address, pickup_city, dropoff_address, dropoff_city, scheduled_at, reference")
    .eq("id", rideId)
    .maybeSingle();
  return data as any;
}

async function loadProfileName(admin: ReturnType<typeof getAdmin>, userId: string): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("full_name, company_name")
    .eq("id", userId)
    .maybeSingle();
  return (data as any)?.company_name || (data as any)?.full_name || "";
}

async function send(admin: ReturnType<typeof getAdmin>, templateName: string, recipientEmail: string, idempotencyKey: string, templateData: Record<string, any>) {
  const { error } = await admin.functions.invoke("send-transactional-email", {
    body: { templateName, recipientEmail, idempotencyKey, templateData },
  });
  if (error) console.error(`send ${templateName} to ${recipientEmail}: ${error.message}`);
  return !error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = getAdmin();
    const body = await req.json().catch(() => ({}));
    const { event, rideId, escortUserId, summary, reason, invoiceId, paymentEvent } = body ?? {};
    const origin = req.headers.get("origin") ?? SITE_ORIGIN;

    if (!event) {
      return new Response(JSON.stringify({ error: "event required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Helper to build common ride context
    const buildRideContext = async (rid: string) => {
      const ride = await loadRide(admin, rid);
      if (!ride) return null;
      const pickup = ride.pickup_address || ride.pickup_city || "";
      const dropoff = ride.dropoff_address || ride.dropoff_city || "";
      const plannedAt = fmtDateTime(ride.scheduled_at);
      const reference = ride.reference ?? "";
      const rideUrl = `${origin}/rit/${ride.id}`;
      return { ride, pickup, dropoff, plannedAt, reference, rideUrl };
    };

    switch (event) {
      case "match_confirmed": {
        // Triggered after close-ride-broadcasts assigns winners.
        if (!rideId) break;
        const ctx = await buildRideContext(rideId);
        if (!ctx) break;
        const { ride, pickup, dropoff, plannedAt, reference, rideUrl } = ctx;
        const clientEmail = await getUserEmail(admin, ride.client_id);
        const clientName = await loadProfileName(admin, ride.client_id);
        const { data: accepted } = await admin
          .from("ride_assignments")
          .select("id, escort_id, escort:escort_profiles(display_name, anonymous_code)")
          .eq("ride_id", rideId)
          .eq("status", "accepted");
        const list = (accepted ?? []) as any[];
        for (const a of list) {
          const escortName = a.escort?.display_name || a.escort?.anonymous_code || "";
          // Notify client (one per accepted escort, deduped by escort_id)
          if (clientEmail) {
            await send(admin, "match-found-client", clientEmail, `match-${rideId}-${a.escort_id}`, {
              clientName, escortName, pickup, dropoff, plannedAt, reference, rideUrl,
            });
          }
          // Notify escort
          const { data: escortProfile } = await admin
            .from("escort_profiles")
            .select("user_id, full_name")
            .eq("id", a.escort_id)
            .maybeSingle();
          if (escortProfile?.user_id) {
            const escortEmail = await getUserEmail(admin, escortProfile.user_id);
            if (escortEmail) {
              await send(admin, "ride-confirmed-escort", escortEmail, `confirm-${rideId}-${a.escort_id}`, {
                escortName: escortProfile.full_name || escortName,
                clientName, pickup, dropoff, plannedAt, reference, rideUrl,
              });
            }
          }
        }
        break;
      }

      case "ride_updated": {
        if (!rideId) break;
        const ctx = await buildRideContext(rideId);
        if (!ctx) break;
        const { pickup, dropoff, plannedAt, reference, rideUrl } = ctx;
        const { data: accepted } = await admin
          .from("ride_assignments")
          .select("escort_id, escort:escort_profiles(user_id, full_name)")
          .eq("ride_id", rideId)
          .eq("status", "accepted");
        const updateKey = `update-${rideId}-${Date.now()}`;
        for (const a of (accepted ?? []) as any[]) {
          const userId = a.escort?.user_id;
          if (!userId) continue;
          const email = await getUserEmail(admin, userId);
          if (!email) continue;
          await send(admin, "ride-updated-escort", email, `${updateKey}-${a.escort_id}`, {
            escortName: a.escort?.full_name || "",
            summary: summary || "Controleer de bijgewerkte ritdetails in de app.",
            pickup, dropoff, plannedAt, reference, rideUrl,
          });
        }
        break;
      }

      case "escort_cancelled": {
        if (!rideId || !escortUserId) break;
        const ctx = await buildRideContext(rideId);
        if (!ctx) break;
        const { ride, pickup, dropoff, plannedAt, reference, rideUrl } = ctx;
        const clientEmail = await getUserEmail(admin, ride.client_id);
        if (!clientEmail) break;
        const clientName = await loadProfileName(admin, ride.client_id);
        const { data: ep } = await admin
          .from("escort_profiles")
          .select("full_name, anonymous_code, display_name")
          .eq("user_id", escortUserId)
          .maybeSingle();
        const escortName = (ep as any)?.display_name || (ep as any)?.full_name || (ep as any)?.anonymous_code || "";
        await send(admin, "cancel-by-escort-client", clientEmail, `cancel-${rideId}-${escortUserId}-${Date.now()}`, {
          clientName, escortName, reason: reason ?? "",
          pickup, dropoff, plannedAt, reference, rideUrl,
        });
        break;
      }

      case "escort_invoice_ready": {
        if (!invoiceId) break;
        const { data: inv } = await admin
          .from("invoices")
          .select("id, invoice_number, escort_id, client_id, total_amount")
          .eq("id", invoiceId)
          .maybeSingle();
        if (!inv) break;
        const invoice = inv as any;
        const { data: ep } = await admin
          .from("escort_profiles")
          .select("user_id, full_name")
          .eq("id", invoice.escort_id)
          .maybeSingle();
        const userId = (ep as any)?.user_id;
        if (!userId) break;
        const escortEmail = await getUserEmail(admin, userId);
        if (!escortEmail) break;
        const clientName = await loadProfileName(admin, invoice.client_id);
        await send(admin, "escort-invoice-ready", escortEmail, `escort-invoice-${invoiceId}`, {
          escortName: (ep as any)?.full_name || "",
          invoiceNumber: invoice.invoice_number || invoice.id,
          clientName,
          amount: fmtMoney(invoice.total_amount),
          invoiceUrl: `${origin}/facturen`,
        });
        break;
      }

      case "payment_succeeded": {
        if (!invoiceId) break;
        const { data: inv } = await admin
          .from("platform_invoices")
          .select("id, invoice_number, client_id, total_amount, paid_at")
          .eq("id", invoiceId)
          .maybeSingle();
        if (!inv) break;
        const invoice = inv as any;
        const clientEmail = await getUserEmail(admin, invoice.client_id);
        if (!clientEmail) break;
        const clientName = await loadProfileName(admin, invoice.client_id);
        await send(admin, "payment-confirm-client", clientEmail, `payment-${invoiceId}`, {
          clientName,
          invoiceNumber: invoice.invoice_number || invoice.id,
          amount: fmtMoney(invoice.total_amount),
          paidAt: fmtDateTime(invoice.paid_at || new Date().toISOString()),
          invoiceUrl: `${origin}/facturen`,
        });
        break;
      }

      case "payment_failed_admin": {
        const adminEmails = await getAdminEmails(admin);
        if (adminEmails.length === 0) break;
        const p = paymentEvent ?? {};
        const idem = `payment-failed-${p.id ?? Date.now()}`;
        for (const email of adminEmails) {
          await send(admin, "payment-failed-admin", email, `${idem}-${email}`, {
            eventType: p.eventType ?? "",
            errorMessage: p.errorMessage ?? "",
            customerEmail: p.customerEmail ?? "",
            amount: p.amount ?? "",
            stripeId: p.stripeId ?? "",
            adminUrl: `${origin}/admin/invoices`,
          });
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `unknown event: ${event}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-ride-event", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
