import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PASSWORD = "Demo1234!";

const CLIENTS = [
  { email: "demo-opdracht1@demo.nl", full_name: "Havenlogistiek Rotterdam BV", phone: "+31101234567" },
  { email: "demo-opdracht2@demo.nl", full_name: "Antwerp Heavy Transport NV", phone: "+3232345678" },
];

const ESCORTS = [
  { email: "demo-begeleider1@demo.nl", full_name: "Jan de Vries", phone: "+31612340001", base_city: "Rotterdam", base_lat: 51.9244, base_lng: 4.4777, hourly_rate: 58 },
  { email: "demo-begeleider2@demo.nl", full_name: "Pieter Janssens", phone: "+32498000002", base_city: "Antwerpen", base_lat: 51.2194, base_lng: 4.4025, hourly_rate: 52 },
  { email: "demo-begeleider3@demo.nl", full_name: "Mark Hendriks", phone: "+31612340003", base_city: "Eindhoven", base_lat: 51.4416, base_lng: 5.4697, hourly_rate: 48 },
  { email: "demo-begeleider4@demo.nl", full_name: "Sander Bakker", phone: "+31612340004", base_city: "Utrecht", base_lat: 52.0907, base_lng: 5.1214, hourly_rate: 60 },
  { email: "demo-begeleider5@demo.nl", full_name: "Henk de Wit", phone: "+31612340005", base_city: "Den Haag", base_lat: 52.0705, base_lng: 4.3007, hourly_rate: 55 },
  { email: "demo-begeleider6@demo.nl", full_name: "Tom Verschueren", phone: "+31612340006", base_city: "Tilburg", base_lat: 51.5555, base_lng: 5.0913, hourly_rate: 46 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const result: { created: string[]; existing: string[]; ids: Record<string, string> } = {
    created: [],
    existing: [],
    ids: {},
  };

  const upsertUser = async (
    email: string,
    full_name: string,
    phone: string,
    role: "opdrachtgever" | "begeleider",
    extra: Record<string, string | number> = {}
  ) => {
    // Try to find existing
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list.users.find((u) => u.email === email);
    if (existing) {
      result.existing.push(email);
      result.ids[email] = existing.id;
      return existing.id;
    }
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name, phone, role, ...extra },
    });
    if (error) throw new Error(`${email}: ${error.message}`);
    result.created.push(email);
    result.ids[email] = data.user!.id;
    return data.user!.id;
  };

  try {
    for (const c of CLIENTS) {
      await upsertUser(c.email, c.full_name, c.phone, "opdrachtgever");
    }
    for (const e of ESCORTS) {
      await upsertUser(e.email, e.full_name, e.phone, "begeleider", {
        base_city: e.base_city,
        base_lat: e.base_lat,
        base_lng: e.base_lng,
        hourly_rate: e.hourly_rate,
      });
    }

    // Seed rides if none exist for client1
    const client1 = result.ids["demo-opdracht1@demo.nl"];
    const client2 = result.ids["demo-opdracht2@demo.nl"];
    const esc1 = result.ids["demo-begeleider1@demo.nl"];
    const esc2 = result.ids["demo-begeleider2@demo.nl"];
    const esc4 = result.ids["demo-begeleider4@demo.nl"];

    const { data: existingRides } = await admin
      .from("rides")
      .select("id")
      .eq("client_id", client1)
      .limit(1);

    if (!existingRides || existingRides.length === 0) {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;

      // Ride 1 — open, future, invitations pending
      const { data: r1 } = await admin.from("rides").insert({
        client_id: client1,
        pickup_address: "Maasvlakteweg 1, Rotterdam",
        pickup_city: "Rotterdam", pickup_lat: 51.9500, pickup_lng: 4.0500,
        dropoff_address: "Hafenstraße 12, Duisburg",
        dropoff_city: "Duisburg", dropoff_lat: 51.4344, dropoff_lng: 6.7623,
        scheduled_at: new Date(now + 3 * day).toISOString(),
        num_escorts: 1, status: "open", app_fee: 2.5,
        cargo_length_m: 38, cargo_width_m: 5.2, cargo_height_m: 4.9, cargo_weight_t: 110,
        permit_number: "XV-2026-0421", client_reference: "PO-2026-118",
        notes: "Nachtrit, transformator.",
        time_window_start: new Date(now + 3 * day).toISOString(),
      }).select().single();
      if (r1) {
        await admin.from("ride_assignments").insert({
          ride_id: r1.id, escort_id: esc1,
          travel_to_pickup_min: 15, travel_back_home_min: 90,
          estimated_hours: 5, estimated_cost: 290, status: "invited",
          responds_by: new Date(now + 10 * 60 * 1000).toISOString(),
        });
      }

      // Ride 2 — accepted, upcoming
      const { data: r2 } = await admin.from("rides").insert({
        client_id: client1,
        pickup_address: "Industriepark 5, Antwerpen",
        pickup_city: "Antwerpen", pickup_lat: 51.2194, pickup_lng: 4.4025,
        dropoff_address: "Acht 22, Eindhoven",
        dropoff_city: "Eindhoven", dropoff_lat: 51.4416, dropoff_lng: 5.4697,
        scheduled_at: new Date(now + 5 * day).toISOString(),
        num_escorts: 1, status: "matched", app_fee: 2.5,
        cargo_length_m: 28, cargo_width_m: 4.5, cargo_height_m: 4.4, cargo_weight_t: 62,
        notes: "Windturbinemast.",
        time_window_start: new Date(now + 5 * day).toISOString(),
      }).select().single();
      if (r2) {
        await admin.from("ride_assignments").insert({
          ride_id: r2.id, escort_id: esc2,
          travel_to_pickup_min: 5, travel_back_home_min: 75,
          estimated_hours: 4, estimated_cost: 208, status: "accepted",
          responded_at: new Date(now - day).toISOString(),
        });
      }

      // Ride 3 — completed + invoiced
      const { data: r3 } = await admin.from("rides").insert({
        client_id: client2,
        pickup_address: "Westhaven 88, Amsterdam",
        pickup_city: "Amsterdam", pickup_lat: 52.4017, pickup_lng: 4.8200,
        dropoff_address: "Lage Weide 14, Utrecht",
        dropoff_city: "Utrecht", dropoff_lat: 52.0907, dropoff_lng: 5.1214,
        scheduled_at: new Date(now - 7 * day).toISOString(),
        num_escorts: 1, status: "completed", app_fee: 2.5,
        cargo_length_m: 22, cargo_width_m: 4.0, cargo_height_m: 4.3, cargo_weight_t: 48,
        notes: "Prefab brugligger.",
        time_window_start: new Date(now - 7 * day).toISOString(),
      }).select().single();
      if (r3) {
        await admin.from("ride_assignments").insert({
          ride_id: r3.id, escort_id: esc4,
          travel_to_pickup_min: 30, travel_back_home_min: 30,
          estimated_hours: 3, estimated_cost: 180,
          actual_hours: 3.5, actual_cost: 210,
          hours_submitted_at: new Date(now - 6 * day).toISOString(),
          status: "accepted",
          responded_at: new Date(now - 8 * day).toISOString(),
          departed_base_at: new Date(now - 7 * day - 30 * 60 * 1000).toISOString(),
          returned_base_at: new Date(now - 7 * day + 3 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, ...result, password: PASSWORD }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message, ...result }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
