import React, { useState } from 'react';
import {
    IonPage,
    IonContent,
    IonButton,
    IonIcon,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { logoGoogle } from 'ionicons/icons';
import LoginForm from '../../components/login/login-form';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

import './login.css';

// ...importaciones existentes

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const history = useHistory();

    // Función para pedir permisos
    const requestPermissions = async () => {
        try {
            // Cámara
            const camStatus = await Camera.requestPermissions();
            // Android: almacenamiento
            if (Capacitor.getPlatform() === 'android') {
                await Filesystem.requestPermissions();
            }
            console.log('✅ Permisos concedidos', camStatus);
            return true;
        } catch (error) {
            console.error('❌ Error solicitando permisos:', error);
            return false;
        }
    };

    const handleLoginSuccess = async () => {
        // Pedir permisos
        const granted = await requestPermissions();
        if (!granted) {
            alert('Debes conceder permisos para continuar');
            setIsLoading(false);
            return;
        }

        // Redirigir a Home
        history.push('/tabs/home');
    };

    // Login con email
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Aquí pondrías tu lógica real de login con email
        await handleLoginSuccess();
    };

    // Login con Google
    const handleGoogleLogin = async () => {
        setIsLoading(true);
        // Aquí pondrías tu lógica real de login con Google
        await handleLoginSuccess();
    };

    return (
        <IonPage>
            <IonContent className="login-page-content">
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