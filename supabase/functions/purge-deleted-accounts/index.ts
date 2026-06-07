// Cron-functie: verwijdert auth-users + cascade van profielen waarvan
// deletion_scheduled_at is verstreken. Aan te roepen met service-role key.
import { createClient } from "npm:@supabase/supabase-js@2";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (auth !== SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const { data: due } = await supabase
    .from("profiles")
    .select("id")
    .not("deletion_scheduled_at", "is", null)
    .lt("deletion_scheduled_at", new Date().toISOString());

  let purged = 0;
  for (const p of (due ?? []) as any[]) {
    try {
      await supabase.auth.admin.deleteUser(p.id);
      purged++;
    } catch (e) {
      console.error("purge user error", p.id, e);
    }
  }
  return new Response(JSON.stringify({ purged, candidates: due?.length ?? 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
