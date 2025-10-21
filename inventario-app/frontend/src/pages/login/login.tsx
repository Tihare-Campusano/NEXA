import React, { useState } from 'react';
import {
    IonPage,
    IonContent,
    IonText,
    IonButton,
    IonIcon,
    useIonToast,
    // 👇 Quitamos Header, Toolbar y Title
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { logoGoogle } from 'ionicons/icons';
import { supabase } from '../../supabaseClient';
import LoginForm from '../../components/login/login-form';

// 👇 1. Importa el NUEVO archivo CSS
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

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
    };

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


    // 👇 2. El RENDER cambia
    return (
        <IonPage>
            {/* Usamos 'className' para aplicar la fuente y el padding */}
            <IonContent className="login-page-content">

                <div className="login-container">

                    {/* 👇 3. AQUÍ VA EL LOGO */}
                    <img
                        src="/public/logo.png" // 👈 ¡REEMPLAZA ESTO CON LA RUTA A TU LOGO!
                        alt="Logo de la App"
                        className="login-logo"
                    />

                    {/* 👇 4. TÍTULOS */}
                    <h1 className="login-title">Bienvenido</h1>
                    <p className="login-subtitle">Inicia sesión para continuar</p>

                    {/* 👇 5. Formulario (sigue igual) */}
                    <LoginForm
                        email={email}
                        setEmail={setEmail}
                        pass={pass}
                        setPass={setPass}
                        handleSubmit={handleEmailLogin}
                        isLoading={isLoading}
                    />

                    {/* 👇 6. Separador "o" */}
                    <div className="separator">o</div>

                    {/* 👇 7. Botón de Google */}
                    <IonButton
                        expand="block"
                        fill="outline"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="google-button" // 👈 Clase CSS
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