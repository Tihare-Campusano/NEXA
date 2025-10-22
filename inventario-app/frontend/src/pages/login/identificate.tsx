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
    IonNote,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { User } from '@supabase/supabase-js';
import { lockClosed, personCircle } from 'ionicons/icons'; // 👈 Importado personCircle para el input
import './Identificate.css'; 

// --- FUNCIÓN DE VALIDACIÓN DE NOMBRE COMPLETO ---
const validateFullName = (name: string): string | null => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
        return 'El nombre no puede estar vacío.';
    }

    // 1. Solo letras (incluyendo ñ y acentos) y espacios
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(trimmedName)) {
        return 'El nombre completo solo puede contener letras y espacios.';
    }

    const words = trimmedName.split(/\s+/).filter(w => w.length > 0);

    // 2. Debe haber al menos dos palabras (Nombre y Apellido)
    if (words.length < 2) {
        return 'Debes ingresar al menos un nombre y un apellido.';
    }

    // 3. Heurística para evitar texto aleatorio (e.g., klsdaksakl)
    // Se verifica la longitud y que la palabra no sea solo una letra repetida (ej. "a a")
    for (const word of words) {
        if (word.length < 2) {
             return 'Cada palabra debe tener al menos dos letras.';
        }
        
        // (La verificación de mayúsculas es muy difícil de hacer sin Falsos Positivos, 
        // pero la validación de que solo sean letras y espacios ya ayuda a evitar "sksksks123")
        
        // Se podría agregar una verificación de la proporción de vocales/consonantes para detectar texto aleatorio,
        // pero por simplicidad, nos basamos en la regex de solo letras y la cuenta de palabras.
    }
    
    return null; // Validación exitosa
};


// --- COMPONENTE Identificate ---

const Identificate: React.FC = () => {
    // ❌ Eliminado: nombre y apellido separados
    // ✅ Nuevo estado para el nombre completo
    const [fullName, setFullName] = useState(''); 
    
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
                history.replace('/login');
            } else {
                setUser(user);

                // Obtener datos del perfil existente
                // Nota: Ahora solo se usa el campo 'nombre' para precargar el nombre completo
                const { data: profile, error: profileError } = await supabase
                    .from('usuarios')
                    // Solo seleccionamos 'nombre', pues ahí guardaremos el nombre completo
                    .select('nombre') 
                    .eq('auth_uid', user.id)
                    .maybeSingle();
                
                if (profileError) {
                    console.error('Error al cargar perfil:', profileError.message);
                }

                let initialName = '';
                
                // 💡 Pre-rellenar si ya existe el nombre completo en DB
                if (profile?.nombre) {
                    initialName = profile.nombre;
                } 
                // 💡 O si vino de Google/OAuth (user_metadata.full_name)
                else if (user.user_metadata.full_name) {
                    initialName = user.user_metadata.full_name;
                }
                
                setFullName(initialName);
            }
            setLoading(false);
        };

        fetchUser();
    }, [history, presentToast]);

    // Función para guardar y actualizar el perfil 
    const handleSubmit = async () => {
        // Ejecutar la validación del nombre completo
        const validationError = validateFullName(fullName);

        if (!user) {
             // Esto no debería pasar si el useEffect funciona, pero es buena práctica.
             return;
        }

        if (validationError) {
            presentToast({
                message: validationError,
                duration: 4000,
                color: 'warning',
            });
            return;
        }

        setLoading(true);

        // 🎯 Lógica de ACTUALIZACIÓN: Solo se actualiza el campo 'nombre' con el nombre completo
        const { error } = await supabase
            .from('usuarios')
            .update({
                nombre: fullName.trim(), // Guardar el nombre completo en el campo 'nombre'
                // ❌ Eliminado: apellido: apellido.trim()
            })
            .eq('auth_uid', user.id); 

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

    if (loading) {
        return (
            <IonPage>
                <IonLoading isOpen={loading} message={'Verificando sesión...'} />
            </IonPage>
        );
    }

    return (
        <IonPage>
            <IonContent fullscreen className="ion-padding auth-page">
                <div className="auth-container card-container">
                    {/* Sección del Logo/Marca */}
                    <div className="logo-section ion-text-center">
                        <IonIcon icon={lockClosed} color="primary" className="logo-icon" />
                        <h1 className="app-title">NEXA App</h1> 
                        <h2 className="tagline">Completa tu perfil</h2> 
                    </div>

                    <p className="ion-text-center ion-margin-bottom description">
                        ¡Bienvenido(a)! Solo te falta un paso para comenzar.
                    </p>
                    
                    {/* Email del usuario (con estilo sutil) */}
                    {user?.email && (
                        <IonNote className="ion-text-center ion-margin-bottom email-note" style={{ display: 'block' }}>
                            Email: {user.email}
                        </IonNote>
                    )}

                    {/* Formulario */}
                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                        {/* Input Único para Nombre Completo */}
                        <IonItem className="ion-margin-bottom input-item"> 
                            <IonIcon icon={personCircle} slot="start" color="medium" /> {/* Icono de perfil */}
                            <IonLabel position="floating">Nombre y Apellido</IonLabel>
                            <IonInput
                                type="text"
                                value={fullName}
                                placeholder="Ej: Juan Pérez" // Placeholder
                                onIonInput={(e) => setFullName(e.detail.value!)}
                                required
                            />
                        </IonItem>

                        {/* Input de Apellido ELIMINADO */}

                        <IonButton
                            expand="block"
                            className="ion-margin-top save-button"
                            type="submit" 
                            disabled={loading || validateFullName(fullName) !== null} // Se deshabilita si la validación falla
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
