import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.akyz.valefill',
  appName: 'ValeFill',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
