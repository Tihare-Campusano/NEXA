import React, { useState, useEffect } from 'react';
import {
    IonPage,
    IonContent,
    IonInput,
    IonButton,
    IonItem,
    IonLabel,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonLoading,
    useIonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';

// Estilos en línea simples para centrar
const containerStyles = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
    padding: '1rem',
    maxWidth: '500px',
    margin: '0 auto',
};

const Identificate: React.FC = () => {
    const [nombre, setNombre] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [presentToast] = useIonToast();
    const history = useHistory();

    // Al cargar, verifica que el usuario esté logueado
    useEffect(() => {
        const fetchUser = async () => {
            // 👇 LÍNEA CORREGIDA (sin el guion bajo)
            const { data } = await supabase.auth.getUser();

            if (data.user) {
                setCurrentUser(data.user);
            } else {
                // Si no hay usuario, no debería estar aquí. Lo regresamos al login.
                history.replace('/login');
            }
        };
        fetchUser();
    }, [history]);

    /**
     * VALIDACIÓN Y GUARDADO DEL NOMBRE
     */
    const handleSaveName = async () => {
        setIsLoading(true);

        // Validación de "nombre y apellido" (evita gibberish)
        // Regex: Busca al menos dos palabras, separadas por un espacio.
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]{2,}(\s[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]{2,})+$/;

        if (!nameRegex.test(nombre.trim())) {
            presentToast({
                message: 'Por favor, ingresa un nombre y apellido válidos (ej: Juan Pérez).',
                duration: 3000,
                color: 'danger',
            });
            setIsLoading(false);
            return;
        }

        if (!currentUser) {
            // Doble chequeo, por si acaso
            presentToast({
                message: 'Error: No se encontró el usuario.',
                duration: 3000,
                color: 'danger',
            });
            setIsLoading(false);
            return;
        }

        // Actualiza el nombre en la tabla 'usuarios'
        const { error } = await supabase
            .from('usuarios')
            .update({ nombre: nombre.trim() })
            .eq('auth_uid', currentUser.id); // Vincula al 'auth_uid'

        if (error) {
            presentToast({
                message: 'Error al guardar el nombre: ' + error.message,
                duration: 3000,
                color: 'danger',
            });
        } else {
            presentToast({
                message: `¡Bienvenido, ${nombre.trim()}!`,
                duration: 2000,
                color: 'success',
            });
            // Éxito: Ahora sí, al inicio de la app
            history.replace('/tabs/home');
        }
        setIsLoading(false);
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Identifícate</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                <IonLoading isOpen={isLoading} message={'Guardando...'} />
                <div style={containerStyles as React.CSSProperties}>
                    <h2 style={{ textAlign: 'center' }}>Casi listo...</h2>
                    <p style={{ textAlign: 'center' }}>
                        Necesitamos saber tu nombre para continuar.
                    </p>

                    <IonItem>
                        <IonLabel position="floating">Nombre y Apellido</IonLabel>
                        <IonInput
                            type="text"
                            value={nombre}
                            onIonInput={(e) => setNombre(e.detail.value!)}
                            required
                        />
                    </IonItem>

                    <IonButton
                        expand="block"
                        className="ion-margin-top"
                        onClick={handleSaveName}
                        disabled={isLoading}
                    >
                        Continuar
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Identificate;