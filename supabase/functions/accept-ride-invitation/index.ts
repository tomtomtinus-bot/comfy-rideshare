// One-click "Ik ben beschikbaar" via signed magic link in email.
// GET /accept-ride-invitation?t=<token>
// Token: base64url("<assignmentId>.<expiresAtMs>.<hmacSig>").
// Behaviour: expresses interest in the 5-min broadcast window.

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
    'raw', new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function htmlPage(title: string, message: string, ctaUrl?: string, ctaText?: string): string {
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} &mdash; ViaCust</title>
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

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(x))
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

  if (await hmac(`${assignmentId}.${expiresAt}`) !== sig) {
    return new Response(htmlPage('Ongeldige link', 'De handtekening klopt niet.'), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  if (Date.now() > expiresAt) {
    return new Response(htmlPage('Link verlopen', 'Deze link is verlopen. Open je dashboard voor de actuele status.', `${origin}/dashboard`, 'Open dashboard'), {
      status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } })

  const { data: assn } = await supabase
    .from('ride_assignments')
    .select('id, status, ride_id, escort_id, responds_by, interest_expressed_at, broadcast_closes_at, travel_to_pickup_min, travel_back_home_min, estimated_hours')
    .eq('id', assignmentId)
    .maybeSingle()

  if (!assn) {
    return new Response(htmlPage('Niet gevonden', 'Deze toewijzing bestaat niet meer.', `${origin}/dashboard`, 'Open dashboard'), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (assn.status === 'accepted') {
    return new Response(htmlPage('Al gekozen &#10003;', 'Je bent al geselecteerd voor deze rit.', `${origin}/opdracht/${assn.ride_id}`, 'Open rit'), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  if (assn.status !== 'invited') {
    return new Response(htmlPage('Niet meer beschikbaar', `Deze uitnodiging heeft status "${assn.status}".`, `${origin}/dashboard`, 'Open dashboard'), {
      status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  if (assn.responds_by && new Date(assn.responds_by).getTime() < Date.now()) {
    return new Response(htmlPage('Uitnodiging verlopen', 'De responstijd is verstreken.', `${origin}/dashboard`, 'Open dashboard'), {
      status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  if (assn.interest_expressed_at) {
    return new Response(htmlPage('Beschikbaarheid genoteerd ✓', 'Je hebt je al beschikbaar gemeld. Binnen enkele minuten wordt de beste match gekozen — je krijgt direct bericht.', `${origin}/dashboard`, 'Open dashboard'), {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Compute score
  const { data: ride } = await supabase
    .from('rides')
    .select('id, client_id, pickup_lat, pickup_lng, pickup_city, dropoff_city, status')
    .eq('id', assn.ride_id).maybeSingle()
  if (!ride || ride.status === 'cancelled') {
    return new Response(htmlPage('Rit niet meer beschikbaar', 'De rit is geannuleerd of niet langer beschikbaar.', `${origin}/dashboard`, 'Open dashboard'), {
      status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
  const { data: escort } = await supabase
    .from('escort_profiles')
    .select('rating')
    .eq('id', assn.escort_id).maybeSingle()

  // Repeat is *with same client*
  const { data: repeats } = await supabase
    .from('ride_assignments')
    .select('id, ride:rides!inner(client_id)')
    .eq('escort_id', assn.escort_id)
    .eq('status', 'accepted')
    .neq('id', assignmentId)
  const sameClient = (repeats ?? []).filter((r: any) => r.ride?.client_id === ride.client_id).length

  // Favoriet?
  const { data: fav } = await supabase
    .from('client_favorite_escorts')
    .select('id')
    .eq('client_id', ride.client_id)
    .eq('escort_id', assn.escort_id)
    .maybeSingle()
  const isFavorite = !!fav

  // Reistijd via de weg (Google Directions, exclusief files) — opgeslagen bij rit-aanmaak
  const travelTo = assn.travel_to_pickup_min ?? 0
  const travelBack = assn.travel_back_home_min ?? 0
  const totalTravelMin = travelTo + travelBack

  // Score-componenten
  // - Reistijd: −0,4 punt per minuut totale aan+afvoer (=−24/uur)
  // - Rating: ×10
  // - Eerdere ritten met deze klant: +4 per stuk (max 5)
  // - Favorietbonus: +30 als favoriet ÉN aanvoer ≤ 90 min (cap voorkomt dat een
  //   favoriet met 3u aanvoer een lokale begeleider verdringt). Tussen 60–90 min
  //   wordt de bonus lineair afgebouwd van +30 naar 0.
  let favoriteBonus = 0
  if (isFavorite) {
    if (travelTo <= 60) favoriteBonus = 30
    else if (travelTo <= 90) favoriteBonus = 30 * (1 - (travelTo - 60) / 30)
    else favoriteBonus = 0
  }

  const score =
    100
    - (totalTravelMin * 0.4)
    + ((escort?.rating ?? 5) * 10)
    + (Math.min(sameClient, 5) * 4)
    + favoriteBonus
  void haversineKm

  const closesAt = new Date(Math.min(
    Date.now() + 5 * 60_000,
    new Date(assn.responds_by).getTime(),
  )).toISOString()

  await supabase
    .from('ride_assignments')
    .update({
      interest_expressed_at: new Date().toISOString(),
      interest_score: score,
      broadcast_closes_at: assn.broadcast_closes_at ?? closesAt,
    })
    .eq('id', assignmentId)
    .eq('status', 'invited')

  // Early close if all invited have expressed
  const { count: pending } = await supabase
    .from('ride_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('ride_id', assn.ride_id)
    .eq('status', 'invited')
    .is('interest_expressed_at', null)
  if ((pending ?? 0) === 0) {
    await supabase
      .from('ride_assignments')
      .update({ broadcast_closes_at: new Date().toISOString() })
      .eq('ride_id', assn.ride_id)
      .eq('status', 'invited')
  }

  return new Response(htmlPage(
    'Beschikbaarheid genoteerd ✓',
    'Bedankt — je staat genoteerd. Binnen 5 minuten wordt de beste match gekozen op basis van reistijd (aan- en afvoer via de weg), rating, eerdere samenwerkingen en of je een favoriete begeleider van de klant bent. Je krijgt direct bericht of je gekozen bent.',
    `${origin}/dashboard`,
    'Open dashboard',
  ), {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
})
