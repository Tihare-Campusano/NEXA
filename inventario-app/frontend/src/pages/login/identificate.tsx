import {
    IonInput,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonSpinner, // Añadido IonSpinner para el estado de carga
} from "@ionic/react";
import React, { useState, useEffect } from "react";
import { personOutline } from "ionicons/icons"; // Cambiado a ícono de persona
import { useHistory } from "react-router-dom"; // <<--- IMPORTACIÓN CLAVE
import './identificate.css';

// --- Inicialización de Supabase ---
import { createClient } from "@supabase/supabase-js";

// Importamos las variables de entorno para Supabase (esto asume que están definidas en el entorno de la aplicación Ionic)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificación básica de que las claves existan antes de crear el cliente
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Componente para registrar el nombre completo de un usuario después de haber iniciado sesión.
 * Mantiene la estética visual del login oscuro original y redirige a /tabs/home al finalizar.
 */
export default function RegistroNombre() {
    // Inicializamos el hook de navegación
    const history = useHistory();

    const [nombreCompleto, setNombreCompleto] = useState('');
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // 1. Obtener el ID del usuario logeado al cargar el componente
    useEffect(() => {
        if (!supabase) return;

        // Función para obtener la sesión del usuario actual
        const getSession = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error("Error al obtener sesión de Supabase:", error);
                // Manejo de errores (ej: redirigir al login)
                return;
            }
            if (data?.session?.user?.id) {
                setUserId(data.session.user.id);
            } else {
                console.log("No hay sesión activa. Redirigiendo a Login.");
                // Lógica para forzar redirección si el usuario no está autenticado
            }
        };

        getSession();
    }, []);

    // Placeholder para el logo NEXA (Usamos <img>)
    const NexaLogo = () => (
        <img
            src="/logo.png"
            alt="Logo de la App"
            className="login-logo"
        />
    );

    const handleGuardarNombre = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!supabase) {
            alert("Error: Supabase no está inicializado. Verifica las variables de entorno.");
            return;
        }

        if (!userId) {
            alert("Error: Usuario no autenticado. Por favor, inicia sesión.");
            return;
        }

        if (!nombreCompleto.trim()) {
            alert("Por favor, ingresa tu nombre completo.");
            return;
        }

        setLoading(true);

        try {
            // Actualizar la tabla 'usuarios'. 
            const { error } = await supabase
                .from('usuarios')
                .update({ nombre: nombreCompleto.trim() })
                .eq('id', userId);

            if (error) {
                alert(`Error al guardar el nombre: ${error.message}`);
                console.error("Supabase Error:", error);
            } else {
                // ÉXITO: Redirigimos a /tabs/home
                console.log("¡Nombre guardado con éxito! Redirigiendo a /tabs/home");
                // Usamos history.push para redirigir
                history.push('/tabs/home');
            }
        } catch (e) {
            console.error("Error inesperado:", e);
            alert("Ocurrió un error inesperado al intentar guardar tu nombre.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-container">

            <IonCard className="login-card">
                <IonCardContent>
                    <div className="nexa-logo-container">
                        <NexaLogo />
                    </div>

                    {/* Títulos actualizados */}
                    <h1 className="welcome-title">Ya estás por ingresar</h1>
                    <p className="subtitle">Ingresa tu Nombre completo para continuar</p>
                    <br />

                    <form onSubmit={handleGuardarNombre}>

                        {/* Campo Nombre Completo */}
                        <div className="input-group">
                            {/* Ícono de Persona */}
                            <IonIcon icon={personOutline} className="input-icon" />
                            <IonInput
                                type="text"
                                placeholder="Nombre Completo"
                                value={nombreCompleto}
                                onIonChange={(e) => setNombreCompleto(e.detail.value!)}
                                className="login-input"
                                required
                            />
                        </div>

                        {/* Botón Guardar / Continuar */}
                        <IonButton
                            type="submit"
                            expand="block"
                            disabled={loading || !nombreCompleto.trim() || !userId}
                            className="btn-primary"
                        >
                            {loading ? <IonSpinner name="crescent" /> : "CONTINUAR"}
                        </IonButton>
                    </form>

                </IonCardContent>
            </IonCard>
        </div>
    );
}
