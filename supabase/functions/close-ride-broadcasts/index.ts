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

  // Compute a [start, end] busy window for an accepted ride so we can detect
  // overlaps with this ride's window. Adds a 30-min buffer on each side plus
  // the escort's travel-to-pickup and travel-back-home margins.
  const BUFFER_MIN = 30
  const DEFAULT_HOURS = 4
  const windowFor = (
    scheduledAt: string,
    timeWindowEnd: string | null,
    estimatedHours: number | null,
    travelToPickupMin: number | null,
    travelBackHomeMin: number | null,
  ): { start: number; end: number } => {
    const startBase = new Date(scheduledAt).getTime()
    const start = startBase - ((travelToPickupMin ?? 0) + BUFFER_MIN) * 60_000
    const endBase = timeWindowEnd
      ? new Date(timeWindowEnd).getTime()
      : startBase + (estimatedHours ?? DEFAULT_HOURS) * 3_600_000
    const end = endBase + ((travelBackHomeMin ?? 0) + BUFFER_MIN) * 60_000
    return { start, end }
  }

  for (const rideId of rideIds) {
    const { data: ride } = await supabase
      .from('rides')
      .select('id, client_id, num_escorts, pickup_city, dropoff_city, status, scheduled_at, time_window_end')
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
      .select('id, escort_id, interest_score, interest_expressed_at, estimated_hours, travel_to_pickup_min, travel_back_home_min')
      .eq('ride_id', rideId)
      .eq('status', 'invited')
      .not('interest_expressed_at', 'is', null)
      .order('interest_score', { ascending: false, nullsFirst: false })
      .order('interest_expressed_at', { ascending: true })

    const list = interested ?? []
    if (list.length === 0) continue

    // CONFLICT CHECK: skip escorts who already have an accepted ride whose
    // time window overlaps this one. Prevents double-booking when an escort
    // expresses interest in multiple overlapping broadcasts.
    const candidateEscortIds = [...new Set(list.map(x => x.escort_id))]
    const conflictingEscortIds = new Set<string>()
    if (candidateEscortIds.length > 0) {
      const { data: otherAccepted } = await supabase
        .from('ride_assignments')
        .select('escort_id, estimated_hours, travel_to_pickup_min, travel_back_home_min, ride:rides!inner(scheduled_at, time_window_end, status)')
        .in('escort_id', candidateEscortIds)
        .eq('status', 'accepted')
        .neq('ride_id', rideId)
      for (const oa of (otherAccepted ?? []) as Array<{
        escort_id: string
        estimated_hours: number | null
        travel_to_pickup_min: number | null
        travel_back_home_min: number | null
        ride: { scheduled_at: string; time_window_end: string | null; status: string } | null
      }>) {
        if (!oa.ride || oa.ride.status === 'cancelled') continue
        const otherWin = windowFor(oa.ride.scheduled_at, oa.ride.time_window_end, oa.estimated_hours, oa.travel_to_pickup_min, oa.travel_back_home_min)
        const cand = list.find(x => x.escort_id === oa.escort_id)
        if (!cand) continue
        const thisWin = windowFor(ride.scheduled_at, ride.time_window_end, cand.estimated_hours, cand.travel_to_pickup_min, cand.travel_back_home_min)
        if (thisWin.start < otherWin.end && otherWin.start < thisWin.end) {
          conflictingEscortIds.add(oa.escort_id)
        }
      }
    }

    const eligible = list.filter(x => !conflictingEscortIds.has(x.escort_id))
    const conflicted = list.filter(x => conflictingEscortIds.has(x.escort_id))

    const winners = eligible.slice(0, slotsLeft).map(x => x.id)
    const losers = eligible.slice(slotsLeft).map(x => x.id)
    const conflictedIds = conflicted.map(x => x.id)

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
    if (conflictedIds.length > 0) {
      await supabase
        .from('ride_assignments')
        .update({ status: 'declined', responded_at: nowIso })
        .in('id', conflictedIds)
        .eq('status', 'invited')
      for (const c of conflicted) {
        notifications.push({
          user_id: c.escort_id,
          type: 'broadcast_conflict',
          title: 'Niet gekozen — overlapt met andere rit',
          body: `Voor ${ride.pickup_city} → ${ride.dropoff_city} ben je niet gekozen omdat je al een bevestigde rit hebt in dezelfde tijdsperiode.`,
          ride_assignment_id: c.id,
          ride_id: rideId,
        })
      }
    }

    // Notifications
    for (const w of list.slice(0, slotsLeft)) {
      notifications.push({
        user_id: w.escort_id,
        type: 'broadcast_won',
        title: 'Je bent gekozen voor de rit ✓',
        body: `${ride.pickup_city} → ${ride.dropoff_city}. Open de rit voor adres en chauffeurgegevens.`,
        ride_assignment_id: w.id,
        ride_id: rideId,
      })
    }
    for (const l of list.slice(slotsLeft)) {
      notifications.push({
        user_id: l.escort_id,
        type: 'broadcast_lost',
        title: 'Net niet gekozen',
        body: `Voor ${ride.pickup_city} → ${ride.dropoff_city} is een andere begeleider gekozen. Bedankt voor je beschikbaarheid.`,
        ride_assignment_id: l.id,
        ride_id: rideId,
      })
    }
    if (winners.length > 0) {
      notifications.push({
        user_id: ride.client_id,
        type: 'broadcast_closed',
        title: `${winners.length} begeleider${winners.length === 1 ? '' : 's'} bevestigd`,
        body: `Voor ${ride.pickup_city} → ${ride.dropoff_city} is de selectie afgerond.`,
        ride_assignment_id: null,
        ride_id: rideId,
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
