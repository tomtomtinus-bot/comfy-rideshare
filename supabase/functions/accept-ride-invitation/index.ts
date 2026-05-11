// One-click acceptance of a ride invitation via signed magic link in email.
// GET /accept-ride-invitation?t=<token>
// Token is a base64url-encoded "<assignmentId>.<expiresAtMs>.<hmacSig>".

import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SECRET = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return atob(s)
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function htmlPage(title: string, message: string, ctaUrl?: string, ctaText?: string): string {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — ViaCust</title>
<style>
body{font-family:-apple-system,'Inter Tight',Inter,Arial,sans-serif;background:#f4f6f8;color:#161f2b;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
.card{background:#fff;border-left:3px solid #f5a800;padding:32px 28px;max-width:480px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.06)}
h1{font-size:20px;margin:0 0 12px;color:#161f2b}
p{font-size:14px;line-height:1.55;color:#556070;margin:0 0 18px}
a.btn{display:inline-block;background:#1a2a3f;color:#f5f7f9;padding:11px 18px;text-decoration:none;font-size:14px;border-radius:2px}
small{display:block;margin-top:24px;font-size:11px;color:#999}
</style></head><body><div class="card"><h1>${title}</h1><p>${message}</p>
${ctaUrl ? `<a class="btn" href="${ctaUrl}">${ctaText ?? 'Open dashboard'}</a>` : ''}
<small>ViaCust</small></div></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  const token = url.searchParams.get('t')
  const origin = url.searchParams.get('origin') ?? 'https://viacust.com'

  if (!token) {
    return new Response(htmlPage('Ongeldige link', 'Geen token aanwezig.'), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  let assignmentId = '', expiresAt = 0, sig = ''
  try {
    const decoded = b64urlDecode(token)
    const parts = decoded.split('.')
    if (parts.length !== 3) throw new Error('bad parts')
    assignmentId = parts[0]
    expiresAt = parseInt(parts[1], 10)
    sig = parts[2]
  } catch {
    return new Response(htmlPage('Ongeldige link', 'De link is beschadigd of niet leesbaar.'), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const expectedSig = await hmac(`${assignmentId}.${expiresAt}`)
  if (expectedSig !== sig) {
    return new Response(htmlPage('Ongeldige link', 'De handtekening klopt niet.'), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (Date.now() > expiresAt) {
    return new Response(htmlPage('Link verlopen', 'Deze acceptatielink is verlopen. Open je dashboard om de actuele status te zien.', `${origin}/dashboard`, 'Open dashboard'), {
      status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } })

  const { data: assn, error: aErr } = await supabase
    .from('ride_assignments')
    .select('id, status, ride_id, escort_id, responds_by')
    .eq('id', assignmentId)
    .maybeSingle()

  if (aErr || !assn) {
    return new Response(htmlPage('Niet gevonden', 'Deze toewijzing bestaat niet meer.', `${origin}/dashboard`, 'Open dashboard'), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (assn.status === 'accepted') {
    return new Response(htmlPage('Al geaccepteerd', 'Je hebt deze rit al bevestigd.', `${origin}/rit/${assn.ride_id}`, 'Open rit'), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (assn.status !== 'invited') {
    return new Response(htmlPage('Niet meer beschikbaar', `Deze uitnodiging heeft status "${assn.status}" en kan niet meer geaccepteerd worden.`, `${origin}/dashboard`, 'Open dashboard'), {
      status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (assn.responds_by && new Date(assn.responds_by).getTime() < Date.now()) {
    return new Response(htmlPage('Uitnodiging verlopen', 'De responstijd voor deze uitnodiging is verstreken.', `${origin}/dashboard`, 'Open dashboard'), {
      status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const { error: uErr } = await supabase
    .from('ride_assignments')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('status', 'invited')

  if (uErr) {
    return new Response(htmlPage('Acceptatie mislukt', uErr.message, `${origin}/rit/${assn.ride_id}`, 'Open rit'), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Best-effort: notify the client (uses existing security definer RPC that infers caller; we use service role so bypass)
  try {
    const { data: ride } = await supabase
      .from('rides')
      .select('client_id, pickup_city, dropoff_city, scheduled_at')
      .eq('id', assn.ride_id)
      .maybeSingle()
    if (ride) {
      const { data: ep } = await supabase
        .from('escort_profiles')
        .select('anonymous_id')
        .eq('id', assn.escort_id)
        .maybeSingle()
      const when = new Date(ride.scheduled_at).toLocaleString('nl-NL', { dateStyle: 'short', timeStyle: 'short' })
      // notifications has no INSERT policy for users; service role bypasses RLS.
      await supabase.from('notifications').insert({
        user_id: ride.client_id,
        type: 'ride_confirmed',
        title: 'Rit bevestigd (via e-mail)',
        body: `Begeleider #${ep?.anonymous_id ?? '????'} heeft uw rit ${ride.pickup_city} → ${ride.dropoff_city} op ${when} bevestigd.`,
        ride_assignment_id: assignmentId,
      })
    }
  } catch (_) { /* non-fatal */ }

  return new Response(htmlPage('Rit bevestigd ✓', 'Bedankt — je bevestiging is geregistreerd. Open de rit in je dashboard voor adres, contactgegevens en chat.', `${origin}/rit/${assn.ride_id}`, 'Open rit'), {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
})
