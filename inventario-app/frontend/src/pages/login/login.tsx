import React, { useState } from 'react';
import {
    IonPage,
    IonContent,
    IonButton,
    IonIcon,
    IonLoading,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { logoGoogle } from 'ionicons/icons';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

import LoginForm from '../../components/login/login-form';
import './login.css';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const history = useHistory();

    // --- Solicitar permisos esenciales ---
    const requestPermissions = async (): Promise<boolean> => {
        try {
            // Permiso de cámara
            const camPerm = await Camera.requestPermissions();
            if (camPerm.camera !== 'granted') return false;

            // Permiso de almacenamiento solo en Android
            if (Capacitor.getPlatform() === 'android') {
                // La función requestPermissions() ya no acepta argumentos directamente.
                // El modo de almacenamiento se configura en AndroidManifest.xml.
                const fsPerm = await Filesystem.requestPermissions();

                // Asumiendo que 'fsPerm' todavía devuelve un objeto con 'publicStorage'
                if (!fsPerm.publicStorage) return false;
            }

            // Permiso de ubicación
            const geoPerm = await Geolocation.requestPermissions();
            if (geoPerm.location !== 'granted') return false;

            return true;
        } catch (error) {
            console.error('❌ Error solicitando permisos:', error);
            return false;
        }
    };

    // Login exitoso
    const handleLoginSuccess = async () => {
        setIsLoading(true);

        const granted = await requestPermissions();
        if (!granted) {
            alert('Debes conceder cámara, almacenamiento y ubicación para continuar');
            setIsLoading(false);
            return;
        }

        // Simular un pequeño delay para mostrar el loading
        await new Promise((res) => setTimeout(res, 1000));

        setIsLoading(false);
        history.push('/tabs/home');
    };

    // Login con email
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !pass) {
            alert('Por favor ingresa email y contraseña');
            return;
        }
        await handleLoginSuccess();
    };

    // Login con Google (simulado)
    const handleGoogleLogin = async () => {
        await handleLoginSuccess();
    };

    return (
        <IonPage>
            <IonContent className="login-page-content">
                <IonLoading isOpen={isLoading} message="Iniciando sesión..." />
                <div className="login-container">
                    <img src="/logo.png" alt="Logo de la App" className="login-logo" />
                    <h1 className="login-title">Bienvenido</h1>
                    <p className="login-subtitle">Inicia sesión para continuar</p>

                    <LoginForm
                        email={email}
                        setEmail={setEmail}
                        pass={pass}
                        setPass={setPass}
                        handleSubmit={handleEmailLogin}
                        isLoading={isLoading}
                    />

                    <div className="separator">o</div>

                    <IonButton
                        expand="block"
                        fill="outline"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="google-button"
                    >
                        <IonIcon icon={logoGoogle} slot="start" />
                        Continuar con Google
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Login;