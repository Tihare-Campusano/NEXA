import React, { useState, useEffect } from 'react';
import {
    IonPage,
    IonContent,
    IonInput,
    IonButton,
    IonItem,
    IonLabel,
    IonLoading,
    useIonToast,
    IonIcon, // Importamos IonIcon si el logo es un icono o se usará como placeholder
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';
// Importa un icono para usar como placeholder de logo (ej: lock-closed)
import { lockClosed } from 'ionicons/icons';
import './Identificate.css'; // **Importamos un CSS dedicado**

// --- COMPONENTE Identificate ---

const Identificate: React.FC = () => {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [presentToast] = useIonToast();
    const history = useHistory();

    // Lógica de autenticación y precarga de datos (sin cambios)
    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                console.error('Error al obtener usuario o no autenticado:', error?.message);
                presentToast({ message: 'Error: No se pudo verificar tu sesión.', color: 'danger', duration: 3000 });
                history.replace('/login');
            } else {
                setUser(user);

                // Opcional: pre-rellenar si ya tiene datos
                const { data: profile } = await supabase
                    .from('usuarios')
                    .select('nombre, apellido') // Incluimos apellido para pre-rellenar si existe
                    .eq('auth_uid', user.id)
                    .maybeSingle();

                if (profile?.nombre) setNombre(profile.nombre);
                // Asumimos que también hay un campo apellido en el perfil
                // if (profile?.apellido) setApellido(profile.apellido); 

            }
            setLoading(false);
        };

        fetchUser();
    }, [history, presentToast]);

    // Función para guardar (sin cambios)
    const handleSubmit = async () => {
        if (!user || !nombre.trim() || !apellido.trim()) {
            presentToast({
                message: 'Por favor completa tu nombre y apellido.',
                duration: 3000,
                color: 'warning',
            });
            return;
        }

        setLoading(true);

        const { error } = await supabase
            .from('usuarios')
            .update({
                nombre: nombre.trim(),
                apellido: apellido.trim()
            })
            .eq('auth_uid', user.id);

        setLoading(false);

        if (error) {
            presentToast({
                message: 'Error al guardar: ' + error.message,
                duration: 3000,
                color: 'danger',
            });
        } else {
            presentToast({
                message: '¡Perfil completado! Bienvenido(a).',
                duration: 2000,
                color: 'success',
            });
            history.replace('/tabs/home');
        }
    };

    // --- UI Modificada ---
    return (
        <IonPage>
            {/* Eliminamos el IonHeader para un look de pantalla completa de login/auth */}
            <IonContent fullscreen className="ion-padding auth-page">
                <IonLoading isOpen={loading} message={'Cargando...'} />

                <div className="auth-container">
                    {/* Sección del Logo/Marca */}
                    <div className="logo-section">
                        {/* Reemplaza este IonIcon con tu logo (Image, SVG, o componente de logo) */}
                        <IonIcon icon={lockClosed} color="primary" className="logo-icon" />
                        <h1 className="app-title">Mi App Inventario</h1> {/* Título principal */}
                        <h2 className="tagline">Completa tu perfil</h2> {/* Título de la sección */}
                    </div>

                    <p className="ion-text-center ion-margin-bottom">
                        Necesitamos saber quién eres para continuar.
                    </p>

                    {/* Formulario */}
                    // PRIMER CAMPO CORREGIDO
                    <IonItem className="ion-margin-bottom">
                        <IonLabel position="floating">Nombre</IonLabel>
                        <IonInput
                            fill="outline" // <-- MOVIDO AQUÍ
                            type="text"
                            value={nombre}
                            onIonInput={(e) => setNombre(e.detail.value!)}
                            required
                        />
                    </IonItem>

// SEGUNDO CAMPO CORREGIDO
                    <IonItem className="ion-margin-bottom">
                        <IonLabel position="floating">Apellido</IonLabel>
                        <IonInput
                            fill="outline" // <-- MOVIDO AQUÍ
                            type="text"
                            value={apellido}
                            onIonInput={(e) => setApellido(e.detail.value!)}
                            required
                        />
                    </IonItem>

                    <IonButton
                        expand="block"
                        className="ion-margin-top"
                        onClick={handleSubmit}
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