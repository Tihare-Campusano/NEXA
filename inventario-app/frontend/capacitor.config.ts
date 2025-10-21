import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexa.app',        // identificador único de tu app
  appName: 'NEXA',              // nombre visible en Android
  webDir: 'dist',   
  plugins: {
    // 👇 AÑADE ESTO
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // 👇 USA EL ID DE CLIENTE TIPO "APLICACIÓN WEB"
      // El mismo que pusiste en Supabase (el que SÍ tiene secreto)
      serverClientId: '617353460185-5g4d3o9eqb1t2vsnphnq0tnquu5jutp3.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};
export default config;