import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quantum.market.android',
  appName: 'Quantum Marketplace',
  webDir: 'dist',
  plugins: {
  CapacitorHttp: { enabled: true },
  CapacitorCookies: { enabled: true },
  server: {
    androidScheme: 'https',
    url: 'https://marketplace-0399.onrender.com',
    cleartext: false,
  },
},
};

export default config;
