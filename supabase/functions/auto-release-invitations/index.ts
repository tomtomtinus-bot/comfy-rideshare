// Cron-triggered: marks expired ride invitations as 'expired' and notifies the client.
// Runs every minute via pg_cron.

import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const nowIso = new Date().toISOString()

  // Pull expired invitations (limit batch)
  // Skip assignments where the escort has already expressed interest — those
  // are handled by the close-ride-broadcasts cron.
  const { data: expired, error: fErr } = await supabase
    .from('ride_assignments')
    .select('id, ride_id, escort_id')
    .eq('status', 'invited')
    .is('interest_expressed_at', null)
    .lt('responds_by', nowIso)
    .limit(200)

  if (fErr) {
    return new Response(JSON.stringify({ error: fErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ released: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const ids = expired.map(e => e.id)
  const { error: uErr } = await supabase
    .from('ride_assignments')
    .update({ status: 'expired' })
    .in('id', ids)
    .eq('status', 'invited')
  if (uErr) {
    return new Response(JSON.stringify({ error: uErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Group by ride; for each ride that is still understaffed, notify the client.
  const byRide = new Map<string, string[]>()
  for (const e of expired) {
    if (!byRide.has(e.ride_id)) byRide.set(e.ride_id, [])
    byRide.get(e.ride_id)!.push(e.escort_id)
  }

  const notifications: Array<Record<string, unknown>> = []
  for (const [rideId, escortIds] of byRide) {
    const { data: ride } = await supabase
      .from('rides')
      .select('client_id, pickup_city, dropoff_city, scheduled_at, num_escorts, status')
      .eq('id', rideId)
      .maybeSingle()
    if (!ride || ride.status === 'cancelled') continue

    const { count: acceptedCount } = await supabase
      .from('ride_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('ride_id', rideId)
      .eq('status', 'accepted')

    const accepted = acceptedCount ?? 0
    const needed = (ride.num_escorts ?? 1) - accepted

    if (needed > 0) {
      notifications.push({
        user_id: ride.client_id,
        type: 'invitations_expired',
        title: 'Begeleider(s) hebben niet gereageerd',
        body: `Voor ${ride.pickup_city} → ${ride.dropoff_city}: ${escortIds.length} uitnodiging(en) verlopen. Nog ${needed} begeleider(s) nodig — open de rit om er extra uit te nodigen.`,
        ride_assignment_id: null,
      })
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications as never)
  }

  return new Response(JSON.stringify({ released: ids.length, notified: notifications.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
