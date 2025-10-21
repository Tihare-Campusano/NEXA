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
import { supabase } from '../../supabaseClient'; // Se mantiene la ruta del 2do archivo
import { User } from '@supabase/supabase-js';

// Estilos en línea simples para centrar (del 2do archivo)
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
    // --- Estados combinados de ambos archivos ---
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState(''); // <-- Añadido del 1er archivo
    const [user, setUser] = useState<User | null>(null); // Renombrado (era currentUser)
    const [loading, setLoading] = useState(true); // Renombrado (era isLoading) y default true
    const [presentToast] = useIonToast();
    const history = useHistory();

    // --- useEffect combinado (lógica del 1er archivo) ---
    // Al cargar, verifica usuario Y precarga datos si existen
    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error) {
                console.error('Error al obtener usuario:', error.message);
                presentToast({ 
                    message: 'Error: No se pudo verificar tu sesión.', 
                    color: 'danger',
                    duration: 3000
                });
                history.replace('/login');
            } else if (user) {
                setUser(user);
                
                // Opcional: pre-rellenar si ya tiene datos
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('nombre, apellido')
                    .eq('auth_uid', user.id)
                    .single();
                    
                if (profile?.nombre) setNombre(profile.nombre);
                if (profile?.apellido) setApellido(profile.apellido);

            } else {
                history.replace('/login');
            }
            setLoading(false);
        };

        fetchUser();
    }, [history, presentToast]);

    /**
     * VALIDACIÓN Y GUARDADO (Lógica del 1er archivo)
     */
    const handleSubmit = async () => {
        // Validación simple para ambos campos
        if (!user || !nombre || !apellido) {
            presentToast({
                message: 'Por favor completa tu nombre y apellido.',
                duration: 3000,
                color: 'warning',
            });
            return;
        }

        setLoading(true);

        // Actualiza ambos campos en la tabla 'usuarios'
        const { error } = await supabase
            .from('usuarios')
            .update({ 
                nombre: nombre.trim(),
                apellido: apellido.trim() // <-- Añadido
            })
            .eq('auth_uid', user.id); // Vincula al 'auth_uid'

        setLoading(false);

        if (error) {
            presentToast({
                message: 'Error al guardar: ' + error.message,
                duration: 3000,
                color: 'danger',
            });
        } else {
            presentToast({
                message: '¡Perfil completado!',
                duration: 2000,
                color: 'success',
            });
            // Éxito: Ahora sí, al inicio de la app
            history.replace('/tabs/home');
        }
    };

    // --- UI Combinada (Estilos del 2do, Inputs del 1ro) ---
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Identifícate</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                {/* Mensaje de carga del 1er archivo */}
                <IonLoading isOpen={loading} message={'Cargando...'} />
                
                <div style={containerStyles as React.CSSProperties}>
                    <h2 style={{ textAlign: 'center' }}>Casi listo...</h2>
                    <p style={{ textAlign: 'center' }}>
                        Necesitamos saber quién eres para continuar.
                    </p>

                    {/* Input de Nombre */}
                    <IonItem>
                        <IonLabel position="floating">Nombre</IonLabel>
                        <IonInput
                            type="text"
                            value={nombre}
                            onIonInput={(e) => setNombre(e.detail.value!)}
                            required
                        />
                    </IonItem>

                    {/* Input de Apellido (Añadido) */}
                    <IonItem>
                        <IonLabel position="floating">Apellido</IonLabel>
                        <IonInput
                            type="text"
                            value={apellido}
                            onIonInput={(e) => setApellido(e.detail.value!)}
                            required
                        />
                    </IonItem>

                    <IonButton
                        expand="block"
                        className="ion-margin-top"
                        onClick={handleSubmit} // Llama a la nueva función
                        disabled={loading}
                    >
                        Guardar y Continuar
                    </IonButton>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Identificate;