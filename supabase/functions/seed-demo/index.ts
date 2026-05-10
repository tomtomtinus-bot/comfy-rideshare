// Demo-seed: wipes existing demo-* users and (re)creates a fresh demo set.
// Safe to run repeatedly. Public (no JWT) but only touches users with
// email ending in "@viacust.demo" — never real users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PASSWORD = "Demo1234!";
const DEMO_DOMAIN = "@viacust.demo";

type Client = {
  email: string;
  full_name: string;
  company_name: string;
  phone: string;
  billing_country: string;
  billing_city: string;
};

type Escort = {
  email: string;
  full_name: string;
  phone: string;
  base_city: string;
  base_lat: number;
  base_lng: number;
  countries: string[];
  hourly_rate: number;
  billing_country: string;
};

const CLIENTS: Client[] = [
  {
    email: "opdracht-rotterdam" + DEMO_DOMAIN,
    full_name: "Rotterdam Heavy Transport",
    company_name: "Rotterdam Heavy Transport BV",
    phone: "+31 10 555 0101",
    billing_country: "Nederland",
    billing_city: "Rotterdam",
  },
  {
    email: "opdracht-amsterdam" + DEMO_DOMAIN,
    full_name: "Amsterdam Logistics",
    company_name: "Amsterdam Logistics BV",
    phone: "+31 20 555 0102",
    billing_country: "Nederland",
    billing_city: "Amsterdam",
  },
  {
    email: "opdracht-antwerpen" + DEMO_DOMAIN,
    full_name: "Antwerp Convoy",
    company_name: "Antwerp Convoy BVBA",
    phone: "+32 3 555 0103",
    billing_country: "België",
    billing_city: "Antwerpen",
  },
];

const ESCORTS: Escort[] = [
  // NL — 6
  { email: "jan-rotterdam" + DEMO_DOMAIN, full_name: "Jan de Vries", phone: "+31 6 1000 0001", base_city: "Rotterdam", base_lat: 51.9225, base_lng: 4.4792, countries: ["Nederland", "België"], hourly_rate: 38, billing_country: "Nederland" },
  { email: "pieter-utrecht" + DEMO_DOMAIN, full_name: "Pieter Jansen", phone: "+31 6 1000 0002", base_city: "Utrecht", base_lat: 52.0907, base_lng: 5.1214, countries: ["Nederland"], hourly_rate: 35, billing_country: "Nederland" },
  { email: "mark-eindhoven" + DEMO_DOMAIN, full_name: "Mark van Dijk", phone: "+31 6 1000 0003", base_city: "Eindhoven", base_lat: 51.4416, base_lng: 5.4697, countries: ["Nederland", "België", "Duitsland"], hourly_rate: 40, billing_country: "Nederland" },
  { email: "sander-denhaag" + DEMO_DOMAIN, full_name: "Sander Bakker", phone: "+31 6 1000 0004", base_city: "Den Haag", base_lat: 52.0705, base_lng: 4.3007, countries: ["Nederland"], hourly_rate: 36, billing_country: "Nederland" },
  { email: "henk-amsterdam" + DEMO_DOMAIN, full_name: "Henk Visser", phone: "+31 6 1000 0005", base_city: "Amsterdam", base_lat: 52.3676, base_lng: 4.9041, countries: ["Nederland"], hourly_rate: 37, billing_country: "Nederland" },
  { email: "tom-tilburg" + DEMO_DOMAIN, full_name: "Tom Smit", phone: "+31 6 1000 0006", base_city: "Tilburg", base_lat: 51.5555, base_lng: 5.0913, countries: ["Nederland", "België"], hourly_rate: 35, billing_country: "Nederland" },
  // BE — 4
  { email: "luc-antwerpen" + DEMO_DOMAIN, full_name: "Luc Peeters", phone: "+32 4 7000 0007", base_city: "Antwerpen", base_lat: 51.2194, base_lng: 4.4025, countries: ["België", "Nederland"], hourly_rate: 38, billing_country: "België" },
  { email: "bart-gent" + DEMO_DOMAIN, full_name: "Bart Janssens", phone: "+32 4 7000 0008", base_city: "Gent", base_lat: 51.0543, base_lng: 3.7174, countries: ["België"], hourly_rate: 36, billing_country: "België" },
  { email: "dries-brussel" + DEMO_DOMAIN, full_name: "Dries De Smet", phone: "+32 4 7000 0009", base_city: "Brussel", base_lat: 50.8503, base_lng: 4.3517, countries: ["België", "Frankrijk"], hourly_rate: 39, billing_country: "België" },
  { email: "kris-luik" + DEMO_DOMAIN, full_name: "Kris Maes", phone: "+32 4 7000 0010", base_city: "Luik", base_lat: 50.6326, base_lng: 5.5797, countries: ["België", "Duitsland"], hourly_rate: 37, billing_country: "België" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Wipe existing demo users (DEMO_DOMAIN + legacy "@demo.nl").
    let page = 1;
    const toDelete: string[] = [];
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      for (const u of data.users) {
        const em = (u.email || "").toLowerCase();
        if (em.endsWith(DEMO_DOMAIN) || em.endsWith("@demo.nl")) toDelete.push(u.id);
      }
      if (data.users.length < 200) break;
      page++;
    }
    for (const id of toDelete) {
      await supabase.auth.admin.deleteUser(id);
    }

    const created: { email: string; role: string; user_id: string }[] = [];

    // 2. Create clients (opdrachtgevers).
    for (const c of CLIENTS) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: c.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: c.full_name,
          phone: c.phone,
          role: "opdrachtgever",
          terms_accepted: "true",
          privacy_accepted: "true",
        },
      });
      if (error) throw new Error(`create client ${c.email}: ${error.message}`);
      const uid = data.user!.id;
      // Approve + fill profile.
      await supabase.from("profiles").update({
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        company_name: c.company_name,
        billing_country: c.billing_country,
        billing_city: c.billing_city,
        billing_email: c.email,
        billing_contact_name: c.full_name,
      }).eq("id", uid);
      created.push({ email: c.email, role: "opdrachtgever", user_id: uid });
    }

    // 3. Create escorts (begeleiders).
    for (const e of ESCORTS) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: e.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: e.full_name,
          phone: e.phone,
          role: "begeleider",
          terms_accepted: "true",
          privacy_accepted: "true",
          base_city: e.base_city,
          base_lat: e.base_lat,
          base_lng: e.base_lng,
          hourly_rate: e.hourly_rate,
        },
      });
      if (error) throw new Error(`create escort ${e.email}: ${error.message}`);
      const uid = data.user!.id;
      await supabase.from("profiles").update({
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        billing_country: e.billing_country,
        billing_email: e.email,
        billing_contact_name: e.full_name,
      }).eq("id", uid);
      await supabase.from("escort_profiles").update({
        countries: e.countries,
        hourly_rate: e.hourly_rate,
        hourly_rate_be: e.hourly_rate,
        hourly_rate_de: e.hourly_rate,
        hourly_rate_fr: e.hourly_rate,
        hourly_rate_lu: e.hourly_rate,
        available: true,
      }).eq("id", uid);
      created.push({ email: e.email, role: "begeleider", user_id: uid });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deleted: toDelete.length,
        created: created.length,
        accounts: created,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
