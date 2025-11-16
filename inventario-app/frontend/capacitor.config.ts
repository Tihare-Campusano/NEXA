import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.nexa.app',// identificador único de tu app
    appName: 'NEXA', // nombre visible en Android
    webDir: 'dist', 
    plugins: {
        // La configuración del plugin se deja, pero la lógica que lo usa fue eliminada en login.tsx
        GoogleAuth: {
            scopes: ['profile', 'email'],
            serverClientId: '617353460185-p7hqfhkdvlmotngb5ep2dvb1in5evbvc.apps.googleusercontent.com',
            forceCodeForRefreshToken: true,
        },
    },
};
export default config;