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
    // Verify caller is authenticated (we use anon client + JWT to verify)
    const authHeader = req.headers.get('Authorization') ?? ''
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

    const body = await req.json().catch(() => ({}))
    const rideId = body?.rideId as string
    const origin = (body?.origin as string) ?? 'https://viacust.com'
    if (!rideId) {
      return new Response(JSON.stringify({ error: 'rideId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    // Verify caller owns this ride
    const { data: ride } = await admin
      .from('rides')
      .select('id, client_id, pickup_city, dropoff_city, scheduled_at')
      .eq('id', rideId)
      .maybeSingle()
    if (!ride || ride.client_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not allowed' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pull all invited assignments for this ride
    const { data: assignments } = await admin
      .from('ride_assignments')
      .select('id, escort_id, responds_by')
      .eq('ride_id', rideId)
      .eq('status', 'invited')

    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Resolve escort emails via auth admin
    const escortIds = [...new Set(assignments.map(a => a.escort_id))]
    const idToEmail = new Map<string, string>()
    const idToName = new Map<string, string>()
    for (const eid of escortIds) {
      const { data } = await admin.auth.admin.getUserById(eid)
      if (data?.user?.email) idToEmail.set(eid, data.user.email)
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

    let sent = 0
    for (const a of assignments) {
      const email = idToEmail.get(a.escort_id)
      if (!email) continue
      const expiresAt = a.responds_by ? new Date(a.responds_by).getTime() : (Date.now() + 30 * 60 * 1000)
      const token = await buildToken(a.id, expiresAt)
      const acceptUrl = `${SUPABASE_URL}/functions/v1/accept-ride-invitation?t=${token}&origin=${encodeURIComponent(origin)}`
      const rideUrl = `${origin}/rit/${ride.id}`

      const { error } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'ride-invitation',
          recipientEmail: email,
          idempotencyKey: `ride-invite-${a.id}`,
          templateData: {
            name: idToName.get(a.escort_id),
            pickup: ride.pickup_city,
            dropoff: ride.dropoff_city,
            plannedAt,
            rideUrl,
            acceptUrl,
          },
        },
      })
      if (!error) sent += 1
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
