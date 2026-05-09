// Shared Google OAuth helpers
export const REDIRECT_URI = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-oauth-callback`;
export const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
].join(" ");

export interface TokenRow {
  escort_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  calendar_id: string;
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) throw new Error(`Token refresh failed: ${await r.text()}`);
  return await r.json() as { access_token: string; expires_in: number };
}

export async function ensureFreshToken(supabase: any, row: TokenRow): Promise<string> {
  const expires = new Date(row.expires_at).getTime();
  if (expires - Date.now() > 60_000) return row.access_token;
  const t = await refreshAccessToken(row.refresh_token);
  const newExpires = new Date(Date.now() + t.expires_in * 1000).toISOString();
  await supabase
    .from("google_calendar_tokens")
    .update({ access_token: t.access_token, expires_at: newExpires })
    .eq("escort_id", row.escort_id);
  return t.access_token;
}
