// Accepts a company invitation. The authenticated user's email MUST match
// the invitation's email. Creates a company_members row (driver) and grants
// the 'begeleider' role if absent.

import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

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
      return new Response(JSON.stringify({ error: 'Log eerst in of maak een account aan met het uitgenodigde e-mailadres.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const token = (body?.token as string | undefined)?.trim()
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token ontbreekt.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    const { data: invitation } = await admin
      .from('company_invitations')
      .select('id, company_id, email, status, expires_at')
      .eq('token', token)
      .maybeSingle()
    if (!invitation) {
      return new Response(JSON.stringify({ error: 'Uitnodiging niet gevonden.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (invitation.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Uitnodiging is al ${invitation.status}.` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (new Date(invitation.expires_at as string).getTime() < Date.now()) {
      await admin.from('company_invitations').update({ status: 'expired' }).eq('id', invitation.id)
      return new Response(JSON.stringify({ error: 'Uitnodiging is verlopen.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if ((user.email ?? '').toLowerCase() !== (invitation.email ?? '').toLowerCase()) {
      return new Response(JSON.stringify({
        error: `Deze uitnodiging is voor ${invitation.email}. Log in met dat e-mailadres om te accepteren.`,
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Mag al lid zijn van ander bedrijf? Blokkeer.
    const { data: existingMember } = await admin
      .from('company_members')
      .select('id, company_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (existingMember && existingMember.company_id !== invitation.company_id) {
      return new Response(JSON.stringify({ error: 'Je bent al lid van een ander bedrijf op ViaCust.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Member aanmaken/activeren.
    if (!existingMember) {
      const { error: memErr } = await admin
        .from('company_members')
        .insert({
          company_id: invitation.company_id,
          user_id: user.id,
          role: 'driver',
          status: 'active',
        })
      if (memErr) {
        return new Response(JSON.stringify({ error: memErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      await admin.from('company_members')
        .update({ status: 'active', role: 'driver' })
        .eq('id', existingMember.id)
    }

    // Begeleider-rol toekennen als die nog ontbreekt.
    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    const hasEscortRole = (roles ?? []).some((r: any) => r.role === 'begeleider')
    if (!hasEscortRole) {
      await admin.from('user_roles').insert({ user_id: user.id, role: 'begeleider' })
    }

    // Profile aanmaken indien afwezig.
    const { data: profile } = await admin
      .from('profiles')
      .select('id, approval_status')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile) {
      await admin.from('profiles').insert({
        id: user.id,
        full_name: (user.user_metadata as any)?.full_name ?? user.email,
        approval_status: 'approved',
      })
    } else if (profile.approval_status === 'pending') {
      // Chauffeurs van een goedgekeurde planner worden meteen goedgekeurd.
      await admin.from('profiles').update({ approval_status: 'approved' }).eq('id', user.id)
    }

    // Escort profile minimaal aanmaken (verplicht voor inloggen als begeleider).
    const { data: ep } = await admin
      .from('escort_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (!ep) {
      await admin.from('escort_profiles').insert({
        id: user.id,
        base_city: 'Onbekend',
        base_lat: 0,
        base_lng: 0,
      } as any)
    }

    await admin.from('company_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return new Response(JSON.stringify({ ok: true, companyId: invitation.company_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
