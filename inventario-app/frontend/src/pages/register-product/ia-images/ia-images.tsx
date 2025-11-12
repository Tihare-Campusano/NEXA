import React, { useState } from "react";
import {
    IonPage,
    IonContent,
    IonButton,
    IonImg,
    IonText,
    IonLoading,
} from "@ionic/react";
import {
    Camera,
    CameraResultType,
    CameraSource,
    CameraDirection,
} from "@capacitor/camera";
import { useHistory, useLocation } from "react-router-dom";

// 🛑 URL de la API de tu Backend de Python (ej. FastAPI o Función Serverless)
// ¡DEBES REEMPLAZAR ESTA URL con la dirección donde montaste tu app_ia.py!
const API_CLASSIFY_URL = "https://inventario-ia-api-887072391939.us-central1.run.app/api/clasificar-producto"; 

// --- Interfaces ---
interface FormData {
    codigo: string; 
    nombre: string;
    marca: string;      // 🛑 Añadido para enviar al Backend
    modelo: string;     // 🛑 Añadido para enviar al Backend
    categoria_id: string; // 🛑 Añadido para enviar al Backend
    compatibilidad: string; // 🛑 Añadido para enviar al Backend
    observaciones: string;  // 🛑 Añadido para enviar al Backend
    stock: string; 
    disponibilidad?: string; 
    estado_ia?: string;
    [key: string]: any;
}

interface BackendResponse {
    status: 'success' | 'error';
    message: string;
    producto_id: number;
    estado_clasificado: string; 
    stock_actual: number;
}

// --- Funciones Auxiliares ---

/**
 * Función para obtener las dimensiones (ancho y alto) de una imagen Base64.
 */
const getImageDimensionsFromBase64 = (base64String: string): Promise<{ width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({
                width: img.naturalWidth || img.width,
                height: img.naturalHeight || img.height,
            });
        };
        img.onerror = (e) => {
            reject(new Error("Error al cargar la imagen para obtener dimensiones."));
        };
        img.src = `data:image/jpeg;base64,${base64String}`;
    });
};

/**
 * Calcula la disponibilidad según las reglas de negocio.
 */
const calcularDisponibilidad = (cantidad: number): string => {
    if (cantidad <= 0) return "Sin stock";
    if (cantidad <= 4) return "Baja disponibilidad";
    if (cantidad <= 10) return "Disponibilidad media";
    return "Alta disponibilidad";
};


// --- Componente Principal ---

const IAImage: React.FC = () => {
    const history = useHistory();
    const location = useLocation();
    
    // Obtenemos los datos pasados desde el componente anterior
    const initialFormData = 
        (location.state as { formData?: FormData })?.formData || ({} as FormData);

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [estadoIA, setEstadoIA] = useState<string | null>(formData.estado_ia || null); 
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
    const [statusText, setStatusText] = useState<string>("Listo para tomar la foto.");
    
    const isServiceReady = true; 

    // 💾 Función central: Llama a la API de Python para clasificar y guardar
    const callBackendAPIAndSave = async (imageBase64: string, width: number, height: number) => {
        if (!formData.codigo) {
            alert("El código de producto no está disponible.");
            return;
        }

        setShowLoadingOverlay(true);
        setLoading(true);
        setStatusText("2. Enviando imagen al servidor de IA...");

        try {
            const userEmail = "correo_usuario@app.com"; // Obtener de la sesión de usuario
            
            // 🛑 CONSTRUYENDO LA PETICIÓN CON TODOS LOS DATOS DEL FORMULARIO
            const requestData = {
                image_base64: imageBase64,
                codigo_barras: formData.codigo,
                user_email: userEmail,
                ancho: width,
                alto: height,
                
                // ✅ ENVIAMOS CAMPOS METADATOS NECESARIOS PARA EL INSERT DEL BACKEND
                nombre: formData.nombre,
                marca: formData.marca,
                modelo: formData.modelo,
                categoria_id: formData.categoria_id,
                compatibilidad: formData.compatibilidad,
                observaciones: formData.observaciones, 

                // Enviamos stock actual del formulario para asegurar consistencia
                stock: formData.stock, 
                disponibilidad: formData.disponibilidad,
                estado: formData.estado,
            };
            
            // 2. Llamada HTTP a la API de Python
            const response = await fetch(API_CLASSIFY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
            });

            const result: BackendResponse = await response.json();

            if (response.ok && result.status === 'success') {
                setStatusText("✅ Clasificación y Stock actualizados.");
                
                const predictedStatus = result.estado_clasificado.toLowerCase();
                
                // 3. Actualizar estado local
                setEstadoIA(predictedStatus); 

                // 4. Preparar datos actualizados para navegación 
                const newDisponibilidad = calcularDisponibilidad(result.stock_actual); 
                
                const updatedForm = {
                    ...formData,
                    estado_ia: predictedStatus,
                    stock: result.stock_actual.toString(), 
                    disponibilidad: newDisponibilidad, 
                };
                
                // 5. Actualizar el estado de la página actual antes de navegar.
                setFormData(updatedForm);

                // 6. Navegar de vuelta
                history.push("/tabs/registro/ia", { formData: updatedForm });

            } else {
                // El error 400 o 500 del backend caerá aquí
                const errorMsg = result.message || "Error desconocido en el servidor.";
                throw new Error(`Error en el servicio de IA/DB: ${errorMsg}`);
            }

        } catch (error: any) {
            console.error("❌ Error en la comunicación con el Backend:", error);
            setStatusText(`❌ Error fatal: ${error.message}`);
            alert(`No se pudo guardar la información. Verifique la conexión con el servidor. Detalle: ${error.message}`);
        } finally {
            setLoading(false);
            setShowLoadingOverlay(false);
        }
    };
    
    // 📸 Tomar foto (La lógica permanece igual, llama a callBackendAPIAndSave)
    const tomarFoto = async () => {
        if (!isServiceReady || loading) return;

        try {
            setLoading(true);
            
            // 1. Capturar la imagen en Base64
            const foto = await Camera.getPhoto({
                quality: 85,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera,
                direction: CameraDirection.Rear,
            });

            if (foto.base64String) {
                const base64Image = foto.base64String;
                const imageUrl = `data:image/jpeg;base64,${base64Image}`;
                
                // 🛑 CORRECCIÓN: Obtener las dimensiones del Base64
                const { width, height } = await getImageDimensionsFromBase64(base64Image);
                
                setImage(imageUrl);
                setEstadoIA(null); // Limpiar estado IA mientras se procesa
                setStatusText("1. Foto capturada, procesando dimensiones...");
                
                // 🚀 Llama al proceso de Backend, que también navega
                await callBackendAPIAndSave(base64Image, width, height);

            } else {
                alert("No se pudo capturar la imagen.");
            }
        } catch (e) {
            console.warn("📷 Cámara cancelada o error:", e);
            setStatusText("Listo para tomar la foto.");
        } finally {
            setLoading(false);
        }
    };
    
    // Función de continuación (solo navega, la lógica de guardado y stock/disponibilidad ya se hizo)
    const continuar = () => {
        history.push("/tabs/registro/ia", { formData: formData });
    };

    // 🧩 UI
    return (
        <IonPage>
            <IonContent className="ion-padding">
                <IonText color="medium">
                    <p>
                        Producto: <b>{formData.codigo || "Cargando..."}</b>
                    </p>
                </IonText>

                <IonText color={isServiceReady ? "success" : "warning"}>
                    <p style={{ textAlign: "center" }}>
                        {isServiceReady ? "✅ Servicio de IA listo" : "❌ Conexión al servicio de IA fallida."}
                    </p>
                </IonText>

                <IonButton
                    expand="block"
                    onClick={tomarFoto} 
                    disabled={loading || !isServiceReady}
                >
                    📸 Tomar Foto y Analizar
                </IonButton>
                
                <p style={{ textAlign: "center", marginTop: "0.5rem", color: '#007bff' }}>
                    {statusText}
                </p>

                {image && (
                    <>
                        <IonImg
                            src={image}
                            alt="Foto del producto"
                            style={{
                                marginTop: "1rem",
                                borderRadius: "8px",
                                border: estadoIA === null 
                                    ? "3px solid gray" 
                                    : estadoIA === "nuevo"
                                    ? "3px solid green"
                                    : estadoIA === "usado"
                                    ? "3px solid orange"
                                    : "3px solid red",
                            }}
                        />

                        {estadoIA ? (
                            <div style={{ marginTop: "1rem" }}>
                                <IonText color="success">
                                    <h2 style={{ textAlign: "center" }}>
                                        Estado detectado: {estadoIA.toUpperCase()}
                                    </h2>
                                </IonText>
                                <IonButton
                                    color="success"
                                    expand="block"
                                    onClick={continuar} 
                                    disabled={loading}
                                >
                                    ✅ Continuar
                                </IonButton>
                            </div>
                        ) : (
                            <IonText color="primary">
                                <p style={{ textAlign: "center", marginTop: "1rem" }}>
                                    {loading ? "Analizando imagen en el servidor..." : "Imagen lista."}
                                </p>
                            </IonText>
                        )}
                    </>
                )}

                <IonLoading
                    isOpen={showLoadingOverlay}
                    message={statusText}
                    duration={0}
                />
            </IonContent>
        </IonPage>
    );
};

export default IAImage;