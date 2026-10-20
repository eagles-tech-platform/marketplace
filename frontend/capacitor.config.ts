import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quantum.market.android',
  appName: 'Quantum Marketplace',
  webDir: 'dist',
  plugins: {
  CapacitorHttp: { enabled: true },
  CapacitorCookies: { enabled: true },
},
};

export default config;
