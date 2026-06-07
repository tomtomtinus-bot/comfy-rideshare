// Cron-triggered (every minute): drives the lock-screen-friendly invitation
// reminder cadence:
//   1) sends a "last 2 minutes" warning push to invited escorts who haven't
//      reacted and whose responds_by is within ~2 minutes
//   2) marks expired invitations as 'expired' and notifies the client AND the
//      escort with a final "invitation expired" push
// Since web pushes can't show a live ticking timer on a locked screen, we
// instead deliver three discrete notifications.

import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function sendPush(userIds: string[], title: string, body: string, url: string, tag?: string) {
  const ids = userIds.filter(Boolean)
  if (ids.length === 0) return
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({ userIds: ids, title, body, url, tag }),
    }).then(r => r.text())
  } catch (e) {
    console.error('[auto-release-invitations] sendPush failed', e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  const now = new Date()
  const nowIso = now.toISOString()
  const warnUntilIso = new Date(now.getTime() + 2 * 60 * 1000).toISOString()

  // --- 1) "Laatste kans: nog 2 minuten" warning push -------------------------
  const { data: warnRows } = await supabase
    .from('ride_assignments')
    .select('id, ride_id, escort_id, responds_by, rides!inner(id, pickup_city, dropoff_city)')
    .eq('status', 'invited')
    .is('interest_expressed_at', null)
    .is('push_warning_sent_at', null)
    .gt('responds_by', nowIso)
    .lte('responds_by', warnUntilIso)
    .limit(200)

  let warned = 0
  for (const r of (warnRows ?? []) as any[]) {
    const ride = r.rides
    if (!ride) continue
    await sendPush(
      [r.escort_id],
      'Laatste kans: nog 2 minuten',
      `${ride.pickup_city} → ${ride.dropoff_city} — reageer binnen 2 min.`,
      `/rit/${ride.id}`,
      `ride-invite-warn-${r.id}`,
    )
    await supabase
      .from('ride_assignments')
      .update({ push_warning_sent_at: nowIso })
      .eq('id', r.id)
    warned++
  }

  // --- 2) Expire invitations + notify escort + notify client -----------------
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
    return new Response(JSON.stringify({ warned, released: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const ids = expired.map(e => e.id)
  const { error: uErr } = await supabase
    .from('ride_assignments')
    .update({ status: 'expired', push_expired_sent_at: nowIso })
    .in('id', ids)
    .eq('status', 'invited')
  if (uErr) {
    return new Response(JSON.stringify({ error: uErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Group by ride; for each ride that is still understaffed, notify the client
  // and tell each escort their invitation expired.
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

    // Push to each escort whose invitation just expired
    for (const escortId of escortIds) {
      await sendPush(
        [escortId],
        'Uitnodiging verlopen',
        `De ritaanvraag ${ride.pickup_city} → ${ride.dropoff_city} is verlopen.`,
        `/rit/${rideId}`,
        `ride-invite-expired-${rideId}-${escortId}`,
      )
    }

    const { count: acceptedCount } = await supabase
      .from('ride_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('ride_id', rideId)
      .eq('status', 'accepted')

    const accepted = acceptedCount ?? 0
    const needed = (ride.num_escorts ?? 1) - accepted

    if (needed > 0) {
      // Are there still other invited assignments out there (e.g. round 2 was
      // already kicked off, or some invites haven't expired yet)?
      const { count: stillInvitedCount } = await supabase
        .from('ride_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('ride_id', rideId)
        .eq('status', 'invited')

      // What's the highest round number on this ride so far?
      const { data: roundRow } = await supabase
        .from('ride_assignments')
        .select('invitation_round')
        .eq('ride_id', rideId)
        .order('invitation_round', { ascending: false })
        .limit(1)
        .maybeSingle()
      const lastRound = (roundRow?.invitation_round as number | undefined) ?? 1

      // Auto second round: nobody accepted, no pending invites, still round 1.
      if (accepted === 0 && (stillInvitedCount ?? 0) === 0 && lastRound < 2) {
        const { data: invited, error: invErr } = await supabase
          .rpc('invite_replacement_escorts', { _ride_id: rideId, _limit: 10 })

        if (!invErr && (invited ?? 0) > 0) {
          // Fire emails for the new round (round 2).
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-ride-invitations`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'apikey': SERVICE_KEY,
              },
              body: JSON.stringify({ rideId, onlyRound: 2 }),
            }).then(r => r.text())
          } catch (e) {
            console.error('[auto-release-invitations] send-ride-invitations (round 2) failed', e)
          }

          notifications.push({
            user_id: ride.client_id,
            type: 'invitations_round2',
            title: 'Tweede ronde gestart',
            body: `Voor ${ride.pickup_city} → ${ride.dropoff_city} reageerde niemand op tijd. We nodigen automatisch nieuwe begeleiders uit (${invited} extra).`,
            ride_assignment_id: null,
            ride_id: rideId,
          })
          continue
        }
      }

      notifications.push({
        user_id: ride.client_id,
        type: 'invitations_expired',
        title: 'Begeleider(s) hebben niet gereageerd',
        body: `Voor ${ride.pickup_city} → ${ride.dropoff_city}: ${escortIds.length} uitnodiging(en) verlopen. Nog ${needed} begeleider(s) nodig — open de rit om er extra uit te nodigen.`,
        ride_assignment_id: null,
        ride_id: rideId,
      })
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications as never)
  }

  return new Response(JSON.stringify({ warned, released: ids.length, notified: notifications.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
