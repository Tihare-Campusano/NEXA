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
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'; // Importación ya presente

// Importa el archivo CSS
import './login.css';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [presentToast] = useIonToast();
    const history = useHistory();

    // 🛠️ FUNCIÓN CON MANEJO DE ERRORES MEJORADO
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: pass,
        });

        if (error) {
            let errorMessage = 'Error de credenciales. Inténtalo de nuevo.';
            
            // Lógica basada en mensajes comunes de Supabase (puede variar ligeramente)
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
            // ✅ CORRECCIÓN: Tras login exitoso, NO hacemos redirección manual.
            // Dejamos que el listener en App.tsx tome el control.
            // Sin embargo, para flujos síncronos (email/pass) es común forzar un re-check de la sesión 
            // navegando a una ruta neutral (como la misma /login) o directamente a la protegida
            // para que el listener se active inmediatamente si no lo ha hecho.
            
            // Para garantizar la redirección inmediata tras el login manual:
            await checkProfileAndRedirect(data.user.id);

            // Opcionalmente, puedes eliminar la llamada a checkProfileAndRedirect 
            // y depender solo de App.tsx (usando history.replace('/') para forzar el chequeo).
        }
        setIsLoading(false);
    };

    // funcion login con google
    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            // ... (Tu lógica de Google Auth con Capacitor)
            const googleUser = await GoogleAuth.signIn();

            if (!googleUser || !googleUser.authentication?.idToken) {
                throw new Error('No se pudo obtener el token de Google.');
            }

            const { error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: googleUser.authentication.idToken,
            });

            if (error) throw error;
            
            // Si tiene éxito, no hacemos nada. El listener de App.tsx se encargará.
            // Para apps móviles, esto es lo mejor.

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
    
    // Esta función maneja la redirección del login manual.
    const checkProfileAndRedirect = async (userId: string) => {
        const { data, error } = await supabase
            .from('usuarios')
            .select('nombre') 
            .eq('auth_uid', userId)
            .maybeSingle(); // 🛠️ Usar maybeSingle() para prevenir error 406.

        // NOTA: No es necesario usar console.warn si el error es solo "no rows found".

        if (data?.nombre) {
            history.replace('/tabs/home');
        } else {
            history.replace('/identificate');
        }
    };

    return (
        <IonPage>
            {/* ... Contenido del Login ... */}
            <IonContent className="login-page-content">
                <div className="login-container">
                    {/* ... logo y títulos ... */}
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