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

    // FUNCIÓN CON MANEJO DE ERRORES MEJORADO
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: pass,
        });

        if (error) {
            let errorMessage = 'Error de credenciales. Inténtalo de nuevo.';
            
            if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'Correo o contraseña inválidos.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Cuenta no confirmada. Revisa tu correo electrónico.';
            } else if (error.message.includes('user not found')) {
                errorMessage = 'Error de correo: El correo no está registrado.';
            } 
            
            presentToast({
                message: errorMessage,
                duration: 4000,
                color: 'danger',
            });
            
        } else if (data.user) {
            // Login exitoso: Forzamos navegación a la raíz. App.tsx toma el control.
            history.replace('/'); 
        }
        setIsLoading(false);
    };

    // funcion login con google
    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const googleUser = await GoogleAuth.signIn();

            if (!googleUser || !googleUser.authentication?.idToken) {
                throw new Error('No se pudo obtener el token de Google.');
            }

            const { error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: googleUser.authentication.idToken,
            });

            if (error) throw error;
            
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
    
    // Esta función ha sido eliminada y su lógica centralizada en App.tsx
    // (pero la dejamos si quieres conservarla para propósitos internos, 
    // corrigiendo la consulta por las dudas)
    const checkProfileAndRedirect = async (userId: string) => {
        const { data } = await supabase
            .from('usuarios')
            .select('nombre') // 🛠️ CORREGIDO: SOLO 'nombre'
            .eq('auth_uid', userId)
            .maybeSingle(); 

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
                        src="/logo.png" 
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