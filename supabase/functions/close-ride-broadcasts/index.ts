// Cron-triggered: closes 5-minute broadcast windows for rides that have at
// least one expressed interest. Picks the top-N escorts by interest_score and
// marks them 'accepted'; the rest become 'declined'. Notifies all parties.

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

  // Find ride_ids whose broadcast window closes now (closes_at <= now and status still invited)
  // We pick distinct ride_ids that have at least one interest_expressed_at and broadcast_closes_at past.
  const { data: closingRows, error: cErr } = await supabase
    .from('ride_assignments')
    .select('ride_id')
    .eq('status', 'invited')
    .lte('broadcast_closes_at', nowIso)
    .not('interest_expressed_at', 'is', null)

  if (cErr) {
    return new Response(JSON.stringify({ error: cErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const rideIds = [...new Set((closingRows ?? []).map(r => r.ride_id))]
  if (rideIds.length === 0) {
    return new Response(JSON.stringify({ closed: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Also include rides where ALL invited assignments have expressed interest (early close)
  // — handled implicitly: when last interest is expressed, frontend may set broadcast_closes_at = now()

  let closedRides = 0
  const notifications: Array<Record<string, unknown>> = []

  for (const rideId of rideIds) {
    const { data: ride } = await supabase
      .from('rides')
      .select('id, client_id, num_escorts, pickup_city, dropoff_city, status')
      .eq('id', rideId)
      .maybeSingle()
    if (!ride || ride.status === 'cancelled') continue

    const needed = ride.num_escorts ?? 1

    // Already accepted (manual/early acceptance) reduce remaining slots
    const { count: alreadyAccepted } = await supabase
      .from('ride_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('ride_id', rideId)
      .eq('status', 'accepted')

    const slotsLeft = Math.max(0, needed - (alreadyAccepted ?? 0))

    // Get all expressed-interest assignments still 'invited'
    const { data: interested } = await supabase
      .from('ride_assignments')
      .select('id, escort_id, interest_score, interest_expressed_at')
      .eq('ride_id', rideId)
      .eq('status', 'invited')
      .not('interest_expressed_at', 'is', null)
      .order('interest_score', { ascending: false, nullsFirst: false })
      .order('interest_expressed_at', { ascending: true })

    const list = interested ?? []
    if (list.length === 0) continue

    const winners = list.slice(0, slotsLeft).map(x => x.id)
    const losers = list.slice(slotsLeft).map(x => x.id)

    if (winners.length > 0) {
      await supabase
        .from('ride_assignments')
        .update({ status: 'accepted', responded_at: nowIso })
        .in('id', winners)
        .eq('status', 'invited')
    }
    if (losers.length > 0) {
      await supabase
        .from('ride_assignments')
        .update({ status: 'declined', responded_at: nowIso })
        .in('id', losers)
        .eq('status', 'invited')
    }

    // Notifications
    for (const w of list.slice(0, slotsLeft)) {
      notifications.push({
        user_id: w.escort_id,
        type: 'broadcast_won',
        title: 'Je bent gekozen voor de rit ✓',
        body: `${ride.pickup_city} → ${ride.dropoff_city}. Open de rit voor adres en chauffeurgegevens.`,
        ride_assignment_id: w.id,
      })
    }
    for (const l of list.slice(slotsLeft)) {
      notifications.push({
        user_id: l.escort_id,
        type: 'broadcast_lost',
        title: 'Net niet gekozen',
        body: `Voor ${ride.pickup_city} → ${ride.dropoff_city} is een andere begeleider gekozen. Bedankt voor je beschikbaarheid.`,
        ride_assignment_id: l.id,
      })
    }
    if (winners.length > 0) {
      notifications.push({
        user_id: ride.client_id,
        type: 'broadcast_closed',
        title: `${winners.length} begeleider${winners.length === 1 ? '' : 's'} bevestigd`,
        body: `Voor ${ride.pickup_city} → ${ride.dropoff_city} is de selectie afgerond.`,
        ride_assignment_id: null,
      })
    }
    closedRides += 1

    if (winners.length > 0) {
      supabase.functions.invoke("notify-ride-event", {
        body: { event: "match_confirmed", rideId },
      }).catch((e) => console.error("notify match_confirmed", e));
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications as never)
  }

  return new Response(JSON.stringify({ closed: closedRides, notifications: notifications.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
