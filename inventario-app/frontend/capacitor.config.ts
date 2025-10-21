import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexa.app',        // identificador único de tu app
  appName: 'NEXA',              // nombre visible en Android
  webDir: 'dist',               // carpeta generada por `ionic build` (o 'build' si usas React clásico)
  server: {
    androidScheme: 'https'      // importante para OAuth y redirecciones
  }
};

export default config;