import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vleer.dobbelen',
  appName: 'Dobbelen',
  webDir: 'build',
  android: {
    // Allow HTTP API calls from the capacitor:// origin (LAN dev backend)
    allowMixedContent: true,
  },
  server: {
    // Surface full JS errors in the native log during development
    errorPath: '/index.html',
  },
};

export default config;
