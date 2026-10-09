import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yashaswahuh.spirit',
  appName: 'Spirit',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#ffffff',
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorUpdater: {
      autoUpdate: false,
      appReadyTimeout: 10000,
      autoDeletePrevious: true,
      autoDeleteFailed: true,
    },
  },
};

export default config;
