import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.6b20f361a1a147cdb1e18547af8ed122',
  appName: 'comfy-rideshare',
  webDir: 'dist',
  // Tijdens development kun je het onderstaande server-blok tijdelijk
  // terugzetten om hot-reload vanaf de Lovable sandbox te gebruiken:
  //
  // server: {
  //   url: 'https://6b20f361-a1a1-47cd-b1e1-8547af8ed122.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    GoogleAuth: {
      // Web client ID — used as serverClientId on iOS/Android to obtain an ID token
      // that Lovable Cloud (Supabase) can verify.
      scopes: ['profile', 'email'],
      serverClientId: '489521062007-l3qb24ue5t92snune33b693vveldj9a6.apps.googleusercontent.com',
      // iOS: client ID of type "iOS" — bundle ID must match this app's bundle ID.
      iosClientId: '489521062007-upteobvulv3mcon96ver2q9iq2couik6.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
