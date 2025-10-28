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

// Importa el archivo CSS
import './login.css';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [isLoading] = useState(false);
    const history = useHistory();

    // Login con email (Ahora redirige inmediatamente a /identificate)
    const handleEmailLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Redirige al presionar Iniciar Sesión (simula un login exitoso)
        history.push('/tabs/home');
        // NOTA: Se ha eliminado la simulación de carga (setIsLoading) y la espera.
    };

    // Login con google (Ahora redirige inmediatamente a /identificate)
    const handleGoogleLogin = () => {
        // Redirige al presionar Continuar con Google
        history.push('/tabs/home');
        // NOTA: Se ha eliminado la simulación de carga (setIsLoading) y la espera.
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
                        // Al hacer submit en el formulario, llama a handleEmailLogin que redirige.
                        handleSubmit={handleEmailLogin}
                        isLoading={isLoading}
                    />

                    <div className="separator">o</div>

                    <IonButton
                        expand="block"
                        fill="outline"
                        // Al hacer clic, llama a handleGoogleLogin que redirige.
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="google-button"
                    >
                        <IonIcon icon={logoGoogle} slot="start" />
                        Continuar con Google
                    </IonButton>
                    {/* Botón de registro eliminado según tu solicitud */}
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Login;