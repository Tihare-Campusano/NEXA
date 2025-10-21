import React, { useState } from 'react';
import {
    IonPage,
    IonContent,
    IonButton,
    IonIcon,
    useIonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { logoGoogle } from 'ionicons/icons';
import { supabase } from '../../supabaseClient';
import LoginForm from '../../components/login/login-form';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

// Importa el archivo CSS
import './login.css';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [presentToast] = useIonToast();
    const history = useHistory();

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: pass,
        });

        if (error) {
            presentToast({
                message: 'Error: ' + error.message,
                duration: 3000,
                color: 'danger',
            });
        } else if (data.user) {
            await checkProfileAndRedirect(data.user.id);
        }
        setIsLoading(false);
    };

    // funcion login con google
    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            // 1️⃣ Llama al plugin nativo
            const googleUser = await GoogleAuth.signIn();

            if (!googleUser || !googleUser.authentication?.idToken) {
                throw new Error('No se pudo obtener el token de Google.');
            }

            // 2️⃣ Pasa el idToken a Supabase
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: googleUser.authentication.idToken,
            });

            if (error) throw error;

            // onAuthStateChange en App.tsx hará la creación de perfil y redirección

        } catch (error: any) {
            presentToast({
                message: 'Error al iniciar con Google: ' + error.message,
                duration: 3000,
                color: 'danger',
            });
        } finally {
            setIsLoading(false);
        }
    };
    // Esta función no cambia, es llamada por el listener en App.tsx
    // o por el login con email.
    const checkProfileAndRedirect = async (userId: string) => {
        const { data, error } = await supabase
            .from('usuarios')
            .select('nombre')
            .eq('auth_uid', userId)
            .single();

        if (error) {
            console.warn('Advertencia:', error.message);
        }

        if (data?.nombre) {
            history.replace('/tabs/home');
        } else {
            history.replace('/identificate');
        }
    };

    return (
        <IonPage>
            <IonContent className="login-page-content">
                <div className="login-container">
                    <img
                        src="/logo.png" // Ruta corregida sin /public
                        alt="Logo de la App"
                        className="login-logo"
                    />

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
