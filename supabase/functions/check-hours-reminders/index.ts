import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = Date.now();
  // Look at assignments where escort accepted, hours not yet submitted, ride started >= 8h ago
  const cutoff8h = new Date(now - 8 * 3600_000).toISOString();

  const { data: rows, error } = await supabase
    .from("ride_assignments")
    .select("id, escort_id, reminder_8h_sent_at, reminder_10h_sent_at, rides!inner(id, scheduled_at, pickup_city, dropoff_city)")
    .eq("status", "accepted")
    .is("hours_submitted_at", null)
    .lte("rides.scheduled_at", cutoff8h);

  if (error) {
    console.error("query error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent8 = 0;
  let sent10 = 0;

  for (const r of rows ?? []) {
    const ride = (r as any).rides;
    const scheduled = new Date(ride.scheduled_at).getTime();
    const hoursSince = (now - scheduled) / 3600_000;
    const route = `${ride.pickup_city} → ${ride.dropoff_city}`;

    if (hoursSince >= 10 && !r.reminder_10h_sent_at) {
      await supabase.from("notifications").insert({
        user_id: r.escort_id,
        ride_assignment_id: r.id,
        ride_id: ride.id,
        type: "hours_reminder_10h",
        title: "Herinnering: vul je uren in",
        body: `Je rit (${route}) is 10 uur geleden gestart. Vul je werkelijke uren in.`,
      });
      await supabase
        .from("ride_assignments")
        .update({ reminder_10h_sent_at: new Date().toISOString() })
        .eq("id", r.id);
      sent10++;
    } else if (hoursSince >= 8 && !r.reminder_8h_sent_at) {
      await supabase.from("notifications").insert({
        user_id: r.escort_id,
        ride_assignment_id: r.id,
        ride_id: ride.id,
        type: "hours_reminder_8h",
        title: "Vergeet je uren niet",
        body: `Je rit (${route}) is 8 uur geleden gestart. Vul je werkelijke uren in.`,
      });
      await supabase
        .from("ride_assignments")
        .update({ reminder_8h_sent_at: new Date().toISOString() })
        .eq("id", r.id);
      sent8++;
    }
  }

  return new Response(JSON.stringify({ checked: rows?.length ?? 0, sent8, sent10 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
