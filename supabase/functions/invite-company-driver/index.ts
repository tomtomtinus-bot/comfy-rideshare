// Invites a driver to the planner's company. Creates an invitation row and
// enqueues an email via send-transactional-email.

import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

function randomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
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
    const emailRaw = (body?.email as string | undefined)?.trim().toLowerCase()
    const origin = (body?.origin as string) || 'https://viacust.com'
    if (!emailRaw || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw)) {
      return new Response(JSON.stringify({ error: 'Geldig e-mailadres vereist' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    // Caller must own a company.
    const { data: company } = await admin
      .from('companies')
      .select('id, name, seat_limit')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!company) {
      return new Response(JSON.stringify({ error: 'Geen bedrijfsprofiel gevonden' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Seat check (members + pending invites < seat_limit).
    const { count: activeCount } = await admin
      .from('company_members')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'active')
    const { count: pendingCount } = await admin
      .from('company_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id).eq('status', 'pending')
    const used = (activeCount ?? 0) + (pendingCount ?? 0)
    if (used >= company.seat_limit) {
      return new Response(JSON.stringify({
        error: `Geen vrije plek beschikbaar (${used}/${company.seat_limit}). Verhoog je abonnement om meer chauffeurs uit te nodigen.`,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Voorkom dubbele open invitation voor zelfde e-mail.
    const { data: existing } = await admin
      .from('company_invitations')
      .select('id')
      .eq('company_id', company.id)
      .eq('status', 'pending')
      .ilike('email', emailRaw)
      .maybeSingle()
    if (existing) {
      return new Response(JSON.stringify({ error: 'Er staat al een openstaande uitnodiging voor dit e-mailadres.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = randomToken()
    const { data: invitation, error: insErr } = await admin
      .from('company_invitations')
      .insert({
        company_id: company.id,
        email: emailRaw,
        token,
        invited_by: user.id,
        role: 'driver',
      })
      .select('id')
      .single()
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const acceptUrl = `${origin}/uitnodiging?token=${encodeURIComponent(token)}`

    // Inviter naam ophalen.
    const { data: inviter } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    // E-mail in queue zetten.
    await admin.functions.invoke('send-transactional-email', {
      body: {
        to: emailRaw,
        template: 'company-invitation',
        data: {
          companyName: company.name,
          inviterName: inviter?.full_name ?? 'Een bedrijfsplanner',
          email: emailRaw,
          acceptUrl,
        },
        idempotency_key: `company-invite-${invitation.id}`,
        purpose: 'transactional',
      },
    }).catch((e) => console.error('email enqueue failed', e))

    return new Response(JSON.stringify({ ok: true, invitationId: invitation.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
