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
    ? new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Amsterdam" })
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
  const { data, error } = await admin
    .from("rides")
    .select("id, client_id, pickup_address, pickup_city, dropoff_address, dropoff_city, scheduled_at, client_reference")
    .eq("id", rideId)
    .maybeSingle();
  if (error) console.error(`[notify-ride-event] loadRide error: ${error.message}`);
  if (data) (data as any).reference = (data as any).client_reference;
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

async function send(_admin: ReturnType<typeof getAdmin>, templateName: string, recipientEmail: string, idempotencyKey: string, templateData: Record<string, any>) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({ templateName, recipientEmail, idempotencyKey, templateData }),
    });
    const txt = await res.text();
    if (!res.ok) {
      console.error(`[notify] send ${templateName} -> ${recipientEmail} FAILED ${res.status}: ${txt}`);
      return false;
    }
    console.log(`[notify] send ${templateName} -> ${recipientEmail} OK`);
    return true;
  } catch (e) {
    console.error(`[notify] send ${templateName} -> ${recipientEmail} threw: ${String(e)}`);
    return false;
  }
}

async function sendPush(userIds: string[], title: string, body: string, url: string) {
  const ids = userIds.filter(Boolean);
  if (ids.length === 0) return;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
      },
      body: JSON.stringify({ userIds: ids, title, body, url }),
    });
    await res.text();
  } catch (e) {
    console.error("[notify] sendPush failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Strict service-role auth guard: only internal server callers allowed.
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

    console.log(`[notify-ride-event] event=${event} rideId=${rideId} escortUserId=${escortUserId} invoiceId=${invoiceId}`);
    switch (event) {
      case "match_confirmed": {
        if (!rideId) break;
        const ctx = await buildRideContext(rideId);
        if (!ctx) { console.log(`[notify-ride-event] ride not found ${rideId}`); break; }
        const { ride, pickup, dropoff, plannedAt, reference, rideUrl } = ctx;
        const clientEmail = await getUserEmail(admin, ride.client_id);
        const clientName = await loadProfileName(admin, ride.client_id);
        const { data: accepted, error: accErr } = await admin
          .from("ride_assignments")
          .select("id, escort_id")
          .eq("ride_id", rideId)
          .eq("status", "accepted");
        const list = (accepted ?? []) as any[];
        console.log(`[notify-ride-event] match_confirmed clientEmail=${clientEmail} acceptedCount=${list.length} accErr=${accErr?.message ?? ""}`);
        for (const a of list) {
          // escort_profiles.id IS the auth.users id
          const escortUserId = a.escort_id as string;
          const { data: ep } = await admin
            .from("escort_profiles")
            .select("anonymous_id")
            .eq("id", escortUserId)
            .maybeSingle();
          const escortFullName = await loadProfileName(admin, escortUserId);
          const escortName = escortFullName || (ep as any)?.anonymous_id || "Begeleider";
          if (clientEmail) {
            await send(admin, "match-found-client", clientEmail, `match-${rideId}-${escortUserId}`, {
              clientName, escortName, pickup, dropoff, plannedAt, reference, rideUrl,
            });
          }
          const escortEmail = await getUserEmail(admin, escortUserId);
          if (escortEmail) {
            await send(admin, "ride-confirmed-escort", escortEmail, `confirm-${rideId}-${escortUserId}`, {
              escortName: escortFullName || escortName,
              clientName, pickup, dropoff, plannedAt, reference, rideUrl,
            });
          }
        }
        const escortIdsM = list.map((a: any) => a.escort_id as string).filter(Boolean);
        await sendPush([ride.client_id, ...escortIdsM], "Rit bevestigd", `${pickup} → ${dropoff} • ${plannedAt}`, `/rit/${ride.id}`);
        void ride;
        break;
      }

      case "ride_updated": {
        if (!rideId) break;
        const ctx = await buildRideContext(rideId);
        if (!ctx) break;
        const { pickup, dropoff, plannedAt, reference, rideUrl } = ctx;
        const { data: accepted } = await admin
          .from("ride_assignments")
          .select("escort_id")
          .eq("ride_id", rideId)
          .eq("status", "accepted");
        const updateKey = `update-${rideId}-${Date.now()}`;
        for (const a of (accepted ?? []) as any[]) {
          const escortUserId = a.escort_id as string;
          const email = await getUserEmail(admin, escortUserId);
          if (!email) continue;
          const escortFullName = await loadProfileName(admin, escortUserId);
          await send(admin, "ride-updated-escort", email, `${updateKey}-${escortUserId}`, {
            escortName: escortFullName,
            summary: summary || "Controleer de bijgewerkte ritdetails in de app.",
            pickup, dropoff, plannedAt, reference, rideUrl,
          });
        }
        const escortIdsU = ((accepted ?? []) as any[]).map((a) => a.escort_id as string).filter(Boolean);
        await sendPush(escortIdsU, "Rit gewijzigd", summary || "De ritdetails zijn bijgewerkt.", `/rit/${rideId}`);
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
          .select("anonymous_id")
          .eq("id", escortUserId)
          .maybeSingle();
        const escortFullName = await loadProfileName(admin, escortUserId);
        const escortName = escortFullName || (ep as any)?.anonymous_id || "Begeleider";
        await send(admin, "cancel-by-escort-client", clientEmail, `cancel-${rideId}-${escortUserId}-${Date.now()}`, {
          clientName, escortName, reason: reason ?? "",
          pickup, dropoff, plannedAt, reference, rideUrl,
        });
        await sendPush([ride.client_id], "Begeleider geannuleerd", `${escortName} kan rit niet rijden. ${pickup} → ${dropoff}`, `/rit/${ride.id}`);
        void ride;
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
        const escortUserId2 = invoice.escort_id as string;
        const escortEmail = await getUserEmail(admin, escortUserId2);
        if (!escortEmail) break;
        const escortFullName = await loadProfileName(admin, escortUserId2);
        const clientName = await loadProfileName(admin, invoice.client_id);
        await send(admin, "escort-invoice-ready", escortEmail, `escort-invoice-${invoiceId}`, {
          escortName: escortFullName,
          invoiceNumber: invoice.invoice_number || invoice.id,
          clientName,
          amount: fmtMoney(invoice.total_amount),
          invoiceUrl: `${origin}/facturen`,
        });
        await sendPush([escortUserId2], "Nieuwe factuur klaar", `${fmtMoney(invoice.total_amount)} • ${clientName}`, `/facturen`);
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
        await sendPush([invoice.client_id], "Betaling ontvangen", `Factuur ${invoice.invoice_number} • ${fmtMoney(invoice.total_amount)}`, `/facturen`);
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
