// Sends ride invitation emails (with one-click accept magic link) to all
// 'invited' assignments for a given ride. Called from the client right after
// inserting ride_assignments. Uses HMAC-signed tokens.

import { createClient } from 'npm:@supabase/supabase-js@2.95.0'
import { createClient as createClientLite } from 'npm:@supabase/supabase-js@2.95.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

function b64urlEncode(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SERVICE_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function buildToken(assignmentId: string, expiresAt: number): Promise<string> {
  const sig = await hmac(`${assignmentId}.${expiresAt}`)
  return b64urlEncode(`${assignmentId}.${expiresAt}.${sig}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Allow service-role invocations (e.g. from the auto-retry cron) to bypass
    // the user-owner check. Otherwise verify the caller owns the ride.
    const authHeader = req.headers.get('Authorization') ?? ''
    const isServiceRole = authHeader === `Bearer ${SERVICE_KEY}`

    let userId: string | null = null
    if (!isServiceRole) {
      const userClient = createClientLite(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      })
      const { data: { user } } = await userClient.auth.getUser()
      if (!user) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = user.id
    }

    const body = await req.json().catch(() => ({}))
    const rideId = body?.rideId as string
    const origin = (body?.origin as string) ?? 'https://viacust.com'
    const onlyRound = body?.onlyRound as number | undefined
    if (!rideId) {
      return new Response(JSON.stringify({ error: 'rideId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    // Verify caller owns this ride (skipped for service-role)
    const { data: ride } = await admin
      .from('rides')
      .select('id, client_id, pickup_city, dropoff_city, scheduled_at')
      .eq('id', rideId)
      .maybeSingle()
    if (!ride || (!isServiceRole && ride.client_id !== userId)) {
      return new Response(JSON.stringify({ error: 'Not allowed' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pull all invited assignments for this ride (optionally only for a specific round)
    let q = admin
      .from('ride_assignments')
      .select('id, escort_id, responds_by, invitation_round')
      .eq('ride_id', rideId)
      .in('status', ['invited', 'accepted'])
    if (typeof onlyRound === 'number') q = q.eq('invitation_round', onlyRound)
    const { data: assignments } = await q

    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve escort emails via auth admin. For company drivers we instead
    // send the invite to the planner (company owner) with a note: "Your
    // driver Jan was offered this ride." The planner accepts on their behalf.
    const escortIds = [...new Set(assignments.map(a => a.escort_id))]
    const idToEmail = new Map<string, string>()
    const idToName = new Map<string, string>()
    const idToDriverName = new Map<string, string>() // escort_id -> driver display name when routed to planner

    // Find which escorts are active company drivers + their planner (owner)
    const { data: driverMemberships } = await admin
      .from('company_members')
      .select('user_id, company:companies!inner(owner_id)')
      .in('user_id', escortIds)
      .eq('role', 'driver')
      .eq('status', 'active')
    const driverToOwner = new Map<string, string>()
    for (const m of (driverMemberships ?? []) as Array<{ user_id: string; company: { owner_id: string } | null }>) {
      if (m.company?.owner_id) driverToOwner.set(m.user_id, m.company.owner_id)
    }

    // Fetch driver names (from profiles) so we can mention them to the planner
    const { data: driverProfs } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', [...driverToOwner.keys()])
    const driverIdToName = new Map<string, string>()
    for (const p of (driverProfs ?? [])) {
      if (p.full_name) driverIdToName.set(p.id, p.full_name.split(' ')[0])
    }

    for (const eid of escortIds) {
      const ownerId = driverToOwner.get(eid)
      const recipientId = ownerId ?? eid
      const { data } = await admin.auth.admin.getUserById(recipientId)
      if (data?.user?.email) idToEmail.set(eid, data.user.email)
      if (ownerId) {
        idToDriverName.set(eid, driverIdToName.get(eid) ?? 'je chauffeur')
      }
    }
    const { data: profs } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', escortIds)
    for (const p of (profs ?? [])) {
      if (p.full_name) idToName.set(p.id, p.full_name.split(' ')[0])
    }

    const plannedAt = new Date(ride.scheduled_at).toLocaleString('nl-NL', {
      dateStyle: 'long', timeStyle: 'short',
    })

    console.log('[send-ride-invitations] processing', { rideId, assignmentCount: assignments.length, escortCount: escortIds.length, emailsResolved: idToEmail.size })

    let sent = 0
    const failures: Array<{ assignmentId: string; reason: string }> = []
    for (const a of assignments) {
      const email = idToEmail.get(a.escort_id)
      if (!email) {
        failures.push({ assignmentId: a.id, reason: 'no email' })
        continue
      }
      const expiresAt = a.responds_by ? new Date(a.responds_by).getTime() : (Date.now() + 30 * 60 * 1000)
      const token = await buildToken(a.id, expiresAt)
      const acceptUrl = `${SUPABASE_URL}/functions/v1/accept-ride-invitation?t=${token}&origin=${encodeURIComponent(origin)}`
      const rideUrl = `${origin}/rit/${ride.id}`

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          'apikey': ANON_KEY,
        },
        body: JSON.stringify({
          templateName: 'ride-invitation',
          recipientEmail: email,
          idempotencyKey: `ride-invite-${a.id}`,
          templateData: {
            name: idToName.get(a.escort_id),
            driverName: idToDriverName.get(a.escort_id) ?? null,
            pickup: ride.pickup_city,
            dropoff: ride.dropoff_city,
            plannedAt,
            rideUrl,
            acceptUrl,
          },
        }),
      })
      const txt = await res.text()
      if (!res.ok) {
        console.error('[send-ride-invitations] fetch error', { assignmentId: a.id, email, status: res.status, body: txt })
        failures.push({ assignmentId: a.id, reason: `HTTP ${res.status}: ${txt}` })
      } else {
        sent += 1
      }
    }

    // Fire-and-forget push notifications to invited escorts, per escort, with
    // their exact deadline (responds_by) included in the body. Because lock-screen
    // pushes can't tick, we communicate the absolute end time instead.
    try {
      await Promise.all(assignments.map(async (a) => {
        const escortId = a.escort_id as string
        if (!escortId) return
        const deadline = a.responds_by ? new Date(a.responds_by) : null
        const deadlineTxt = deadline
          ? deadline.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
          : null
        const body = `${ride.pickup_city} → ${ride.dropoff_city} • ${plannedAt}` +
          (deadlineTxt ? ` • Reageer vóór ${deadlineTxt}` : '')
        await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ANON_KEY}`,
            'apikey': ANON_KEY,
          },
          body: JSON.stringify({
            userIds: [escortId],
            title: 'Nieuwe ritaanvraag',
            body,
            url: `/rit/${ride.id}`,
            tag: `ride-invite-${a.id}`,
          }),
        }).then(r => r.text())
      }))
    } catch (e) {
      console.error('[send-ride-invitations] push failed', e)
    }

    console.log('[send-ride-invitations] done', { rideId, sent, failures })

    return new Response(JSON.stringify({ sent, failures }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
