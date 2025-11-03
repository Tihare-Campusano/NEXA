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
import { Capacitor } from '@capacitor/core';

import LoginForm from '../../components/login/login-form';
import './login.css';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const history = useHistory();

    // --- FUNCION PARA PEDIR PERMISOS ---
    const requestPermissions = async (): Promise<boolean> => {
        try {
            // Pedir permiso de cámara
            await Camera.requestPermissions();
            
            // Pedir permiso de archivos solo en Android
            if (Capacitor.getPlatform() === 'android') {
                await Filesystem.requestPermissions();
            }

            // Aquí podrías agregar más permisos si tu app los necesita
            return true;
        } catch (error) {
            console.error('❌ Error solicitando permisos:', error);
            return false;
        }
    };

    // Función que simula login exitoso
    const handleLoginSuccess = async () => {
        setIsLoading(true);

        // Pedir permisos antes de continuar
        const granted = await requestPermissions();
        if (!granted) {
            alert('Debes conceder todos los permisos para continuar');
            setIsLoading(false);
            return;
        }

        // Simular delay
        await new Promise((res) => setTimeout(res, 1000));

        setIsLoading(false);
        history.push('/tabs/home'); // Redirigir a Home
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