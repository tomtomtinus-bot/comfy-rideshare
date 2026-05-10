import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.viacust.escorts',
  appName: 'ViaCust',
  webDir: 'dist',
  server: {
    url: 'https://6b20f361-a1a1-47cd-b1e1-8547af8ed122.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
