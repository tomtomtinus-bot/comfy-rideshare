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
  },
};

export default config;
