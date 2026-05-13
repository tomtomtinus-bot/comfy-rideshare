import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { supabase } from "@/integrations/supabase/client";

let initialized = false;

/**
 * Returns true when running inside the native iOS/Android Capacitor shell.
 * On the web (PWA / browser) we keep using the managed Lovable Cloud OAuth flow.
 */
export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * Native Google sign-in for iOS/Android.
 * Uses the platform-specific OAuth client (configured in capacitor.config.ts)
 * to obtain a Google ID token, then exchanges it with Lovable Cloud.
 */
export async function signInWithGoogleNative() {
  if (!initialized) {
    await GoogleAuth.initialize();
    initialized = true;
  }

  const result = await GoogleAuth.signIn();
  const idToken = result.authentication?.idToken;
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
