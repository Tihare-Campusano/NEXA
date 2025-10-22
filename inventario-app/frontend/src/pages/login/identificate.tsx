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
    IonIcon,
    IonNote, // Añadido para mostrar el email si es necesario
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';
import { lockClosed } from 'ionicons/icons';
// ⚠️ Asegúrate de tener un archivo 'Identificate.css' para los estilos.
import './Identificate.css'; 

// --- COMPONENTE Identificate ---

const Identificate: React.FC = () => {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [presentToast] = useIonToast();
    const history = useHistory();

    // Lógica para verificar la sesión y precargar datos
    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error || !user) {
                console.error('Error al obtener usuario o no autenticado:', error?.message);
                presentToast({ message: 'Error: No se pudo verificar tu sesión.', color: 'danger', duration: 3000 });
                // Redirige al login si no hay sesión
                history.replace('/login');
            } else {
                setUser(user);

                // Obtener datos del perfil existente para precargar/verificar
                const { data: profile, error: profileError } = await supabase
                    .from('usuarios')
                    .select('nombre, apellido')
                    .eq('auth_uid', user.id)
                    .maybeSingle();
                
                if (profileError) {
                    console.error('Error al cargar perfil:', profileError.message);
                }

                // 💡 Pre-rellenar si ya existen datos o si vino de Google/OAuth
                if (profile?.nombre) {
                    setNombre(profile.nombre);
                } else if (user.user_metadata.full_name) {
                    // Intenta precargar de los metadatos de OAuth si está disponible
                    setNombre(user.user_metadata.full_name);
                }
                
                if (profile?.apellido) {
                    setApellido(profile.apellido);
                }
            }
            setLoading(false);
        };

        fetchUser();
    }, [history, presentToast]);

    // Función para guardar y actualizar el perfil 
    const handleSubmit = async () => {
        // Validación de campos
        if (!user || !nombre.trim() || !apellido.trim()) {
            presentToast({
                message: 'Por favor, completa tu nombre y apellido.',
                duration: 3000,
                color: 'warning',
            });
            return;
        }

        setLoading(true);

        // 🎯 Lógica de ACTUALIZACIÓN de la tabla 'usuarios'
        const { error } = await supabase
            .from('usuarios')
            .update({
                nombre: nombre.trim(),
                apellido: apellido.trim()
                // Puedes agregar más campos aquí
            })
            .eq('auth_uid', user.id); // 🔑 CLAVE: Filtra por el ID de autenticación

        setLoading(false);

        if (error) {
            presentToast({
                message: 'Error al guardar el perfil: ' + error.message,
                duration: 4000,
                color: 'danger',
            });
        } else {
            presentToast({
                message: '¡Perfil completado! Redirigiendo...',
                duration: 2000,
                color: 'success',
            });
            // 🎯 Redirección final al dashboard
            history.replace('/tabs/home');
        }
    };

    // Si está cargando o no hay usuario autenticado (se redirige en el useEffect)
    if (loading) {
        return (
            <IonPage>
                <IonLoading isOpen={loading} message={'Verificando sesión...'} />
            </IonPage>
        );
    }

    // --- UI Modificada ---
    return (
        <IonPage>
            <IonContent fullscreen className="ion-padding auth-page">
                <div className="auth-container">
                    {/* Sección del Logo/Marca */}
                    <div className="logo-section">
                        <IonIcon icon={lockClosed} color="primary" className="logo-icon" />
                        <h1 className="app-title">NEXA App</h1> 
                        <h2 className="tagline">Completa tu perfil</h2> 
                    </div>

                    <p className="ion-text-center ion-margin-bottom">
                        ¡Bienvenido(a)! Solo te falta un paso para comenzar.
                    </p>
                    
                    {/* Email del usuario (opcional, útil para debugging/UX) */}
                    {user?.email && (
                        <IonNote className="ion-text-center ion-margin-bottom" style={{ display: 'block' }}>
                            Email: {user.email}
                        </IonNote>
                    )}

                    {/* Formulario */}
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                        <IonItem className="ion-margin-bottom">
                            <IonLabel position="floating">Nombre</IonLabel>
                            <IonInput
                                type="text"
                                value={nombre}
                                onIonInput={(e) => setNombre(e.detail.value!)}
                                required
                            />
                        </IonItem>

                        <IonItem className="ion-margin-bottom">
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
                            type="submit" // Usar type="submit" para que el formulario funcione al presionar Enter
                            disabled={loading || !nombre.trim() || !apellido.trim()}
                        >
                            Guardar y Continuar
                        </IonButton>
                    </form>
                </div>
            </IonContent>
        </IonPage>
    );
};

export default Identificate;