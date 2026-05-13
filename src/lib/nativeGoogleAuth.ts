import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";

const WEB_CLIENT_ID =
  "489521062007-l3qb24ue5t92snune33b693vveldj9a6.apps.googleusercontent.com";
const IOS_CLIENT_ID =
  "489521062007-upteobvulv3mcon96ver2q9iq2couik6.apps.googleusercontent.com";

let initialized = false;

export const isNativeApp = () => Capacitor.isNativePlatform();

async function ensureInitialized() {
  if (initialized) return;
  await SocialLogin.initialize({
    google: {
      iOSClientId: IOS_CLIENT_ID,
      // Used by the plugin to request an ID token verifiable by Lovable Cloud.
      iOSServerClientId: WEB_CLIENT_ID,
      webClientId: WEB_CLIENT_ID,
      mode: "online",
    },
  });
  initialized = true;
}

/**
 * Native Google sign-in for iOS/Android.
 * Obtains a Google ID token and exchanges it with Lovable Cloud.
 */
export async function signInWithGoogleNative() {
  await ensureInitialized();

  const res = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["profile", "email"] },
  });

  // Plugin returns { provider, result: { idToken, ... } }
  const idToken =
    (res as { result?: { idToken?: string } })?.result?.idToken ?? null;

  if (!idToken) {
    throw new Error("Geen Google ID token ontvangen");
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error) throw error;
  return data;
}
