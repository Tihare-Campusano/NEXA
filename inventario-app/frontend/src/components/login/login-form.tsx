import React from 'react';
import { IonInput, IonButton, IonItem, IonSpinner, IonIcon } from '@ionic/react';
// 👇 Importamos los iconos
import { mailOutline, lockClosedOutline } from 'ionicons/icons';

interface LoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  pass: string;
  setPass: (pass: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void; 
  isLoading: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
    email,
    setEmail,
    pass,
    setPass,
    handleSubmit,
    isLoading,
}) => {
    return (
        <form onSubmit={handleSubmit}>

            {/* Input de Email con icono */}
            <IonItem lines="none" className="login-input-item">
                <IonIcon icon={mailOutline} slot="start" />
                <IonInput
                    type="email"
                    placeholder="Correo Electrónico"
                    value={email}
                    onIonInput={(e) => setEmail(e.detail.value!)}
                    required
                />
            </IonItem>

            {/* Input de Contraseña con icono */}
            <IonItem lines="none" className="login-input-item">
                <IonIcon icon={lockClosedOutline} slot="start" />
                <IonInput
                    type="password"
                    placeholder="Contraseña"
                    value={pass}
                    onIonInput={(e) => setPass(e.detail.value!)}
                    required
                />
            </IonItem>

            {/* Botón de Envío */}
            <IonButton
                type="submit"
                expand="block"
                className="login-button" // 👈 Clase CSS
                disabled={isLoading}
            >
                {isLoading ? <IonSpinner name="crescent" /> : 'Iniciar Sesión'}
            </IonButton>
        </form>
    );
};

export default LoginForm;