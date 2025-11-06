// IAImagen.tsx
// Componente para tomar una foto, analizarla con el modelo TFLite de estado de producto
// y actualizar el estado de stock en el formulario de registro.

// --- 1. IMPORTACIONES ---
import {
    IonPage,
    IonContent,
    IonButton,
    IonImg,
    IonText,
    IonLoading,
} from "@ionic/react";
import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
// Importamos Source y Prompt, que son cruciales para el comportamiento deseado de la cámara
import { Camera, CameraResultType, CameraSource, CameraDirection } from "@capacitor/camera"; 
import { createClient } from "@supabase/supabase-js";
import { useHistory, useLocation } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import * as tflite from "@tensorflow/tfjs-tflite";
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-wasm';

// --- 2. CONFIGURACIÓN DE SUPABASE (SIN CAMBIOS) ---
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// --- 3. DEFINICIÓN DEL COMPONENTE ---
// Definición de tipos para la data que llega por `history.push`
interface FormData {
    codigo: string;
    nombre: string;
    stock: string; // Stock actual como string
    [key: string]: any; // Permite otras propiedades
}

export default function IAImagen() {
    // --- Hooks de Navegación ---
    const history = useHistory();
    const location = useLocation();
    // Obtener los datos del formulario (código, stock actual, etc.)
    const formData = (location.state as { formData?: FormData })?.formData || {} as FormData;

    // --- 4. ESTADOS DEL COMPONENTE ---
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [estadoIA, setEstadoIA] = useState<string | null>(null);
    const [modeloLite, setModeloLite] = useState<tflite.TFLiteModel | null>(null);
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

    // --- 5. CARGA DEL MODELO DE IA ---
    useEffect(() => {
        const loadModelLite = async () => {
            setShowLoadingOverlay(true);
            try {
                // Asegurar que el backend (WebAssembly o WebGL) esté listo
                await tf.ready();
                console.log("✅ Backend de TensorFlow listo.");

                // Cargamos el modelo TFLite. 
                // Ruta corregida: Usamos una ruta absoluta desde la carpeta 'public'.
                // La ruta 'C:\Users\cornu\...' es local de tu PC y no funcionará en la app.
                const m = await tflite.loadTFLiteModel("/modelo_ia/modelo_final.tflite");
                
                setModeloLite(m);
                console.log("✅ Modelo TFLite cargado correctamente");
            } catch (err) {
                console.error("❌ Error cargando modelo TFLite. VERIFICA LA RUTA DEL ARCHIVO:", err);
                // Usamos una alerta más amigable
                console.error("Asegúrate de que '/modelo_ia/modelo_final.tflite' sea la ruta correcta relativa a tu carpeta 'public'.");
            }
            setShowLoadingOverlay(false);
        };
        loadModelLite();
    }, []);

    // --- 6. FUNCIÓN PARA TOMAR FOTO (CORREGIDA) ---
    const tomarFoto = async () => {
        // Reiniciar estados de análisis al tomar nueva foto
        setEstadoIA(null); 
        setLoading(true);

        try {
            const isNative = Capacitor.isNativePlatform();
            
            const foto = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                // ** CORRECCIÓN 1: Usamos Base64 en nativo para evitar problemas de permisos (CORS/filesystem)**
                // Si estamos en un dispositivo nativo, Base64 es la forma más segura.
                resultType: isNative ? CameraResultType.Base64 : CameraResultType.DataUrl, 
                
                // ** CORRECCIÓN 2: Forzamos la apertura de la cámara (CameraSource.Camera)**
                source: CameraSource.Camera, // Forzar uso de la cámara, ignora la galería
                direction: CameraDirection.Rear, // Opción: usar cámara trasera por defecto
            });

            let imageUrl: string | null = null;
            
            if (foto.base64String) {
                // Si Base64 fue exitoso, construimos el DataURL
                imageUrl = `data:image/jpeg;base64,${foto.base64String}`;
            } else if (foto.dataUrl) {
                // Si no es Base64, usamos DataUrl (generalmente en Web)
                imageUrl = foto.dataUrl;
            } else if (foto.webPath) {
                // Fallback para webPath si es necesario, aunque Base64 es preferido en nativo
                 imageUrl = foto.webPath;
            }
            
            setImage(imageUrl);

        } catch (e) {
            console.log("El usuario canceló la toma de la foto o hubo un error en la cámara.", e);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Función para calcular la disponibilidad según las reglas especificadas (SIN CAMBIOS)
    const calcularDisponibilidad = (cantidad: number): string => {
        if (cantidad <= 0) return "Sin stock";
        if (cantidad >= 1 && cantidad <= 4) return "Baja disponibilidad";
        if (cantidad >= 5 && cantidad <= 10) return "Disponibilidad media";
        return "Alta disponibilidad"; // Para 11 en adelante
    };

    // --- 7. FUNCIÓN PARA PREDECIR CON LA IA (CORREGIDA) ---
    // Usamos useEffect para que la predicción se ejecute automáticamente cuando 'image' cambie y no sea null.
    useEffect(() => {
        if (image && modeloLite) {
            predecirEstadoLite();
        }
    }, [image, modeloLite]);


    const predecirEstadoLite = async () => {
        if (!modeloLite || !image) return;

        setLoading(true);
        setShowLoadingOverlay(true);
        
        // Creamos un objeto Image para cargar la imagen (funciona con DataURL de Base64)
        const img = new Image();
        img.src = image;

        // Utilizamos una promesa para esperar correctamente a que la imagen se cargue.
        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                resolve();
            };
            img.onerror = (e) => {
                console.error("Error al cargar la imagen para TFLite:", e);
                reject(new Error("No se pudo cargar la imagen para analizar."));
            };
        });
        
        let output: tf.Tensor | null = null;
        try {
            await tf.ready();
            
            // 1. Preprocesamiento: Cargar, redimensionar, convertir a float y normalizar
            const tensor = tf.browser.fromPixels(img)
                .resizeNearestNeighbor([224, 224])
                .toFloat().div(tf.scalar(255)) // Normalizar a [0, 1]
                .expandDims(0); // Añadir la dimensión de batch (1, 224, 224, 3)
            
            console.log("Dimensiones del tensor de entrada:", tensor.shape);
            
            // 2. Predicción
            output = modeloLite.predict(tensor) as tf.Tensor;

            if (!output) {
                throw new Error("La predicción del modelo devolvió un resultado nulo.");
            }

            // 3. Postprocesamiento: Obtener el índice de la clase con mayor probabilidad
            const scores = (await output.array()) as number[][];
            const idx = scores[0].indexOf(Math.max(...scores[0]));
            
            // Etiquetado de resultados (Asegúrate de que este orden sea CORRECTO)
            const etiquetas = ["mal_estado", "nuevo", "usado"]; 
            const resultado = etiquetas[idx] || "Desconocido";

            setEstadoIA(resultado);
            // Reemplazamos alert() con console.log o un modal, pero dejamos el log aquí por si acaso.
            console.log(`Estado detectado por IA: ${resultado}`); 
            

        } catch (error) {
            console.error("❌ Error al predecir con TFLite. Revisar consola para detalles.", error);
            // Este es el mensaje de error de la captura original
            alert("Ocurrió un error al analizar la imagen. Esto puede ser por la operación TFLite."); 
        } finally {
            if (output) output.dispose(); // Limpieza de memoria del tensor
            setLoading(false);
            setShowLoadingOverlay(false);
        }
    };
    
    // --- 8. FUNCIÓN PARA GUARDAR Y VOLVER AL FORMULARIO (SIN CAMBIOS) ---
    const guardarYVolver = async () => {
        // Asegurarse que tenemos la información mínima
        if (!image || !estadoIA || !formData.codigo) {
            alert("Se necesita una foto, un análisis de IA y un código de producto para continuar.");
            return;
        }

        setLoading(true);
        setShowLoadingOverlay(true);

        try {
            // --- 8.1 Subir Imagen a Supabase ---
            // Solo podemos hacer fetch si es un DataURL o WebPath válido.
            if (!image.startsWith("data:")) {
                throw new Error("La URL de la imagen no es un DataURL válido.");
            }
            
            const response = await fetch(image);
            const blob = await response.blob();
            const fileName = `productos/${formData.codigo}_${Date.now()}.png`;

            const { error: uploadError } = await supabase.storage
                .from("imagenes-productos")
                .upload(fileName, blob, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Obtener la URL pública de la imagen
            const { data: publicUrlData } = supabase.storage
                .from("imagenes-productos")
                .getPublicUrl(fileName);

            // --- 8.2 Actualizar Stock y Disponibilidad ---
            // El stock en formData es el stock inicial/actual
            const currentStock = parseInt(formData.stock || "0", 10);
            const newStock = currentStock + 1; // Incrementamos el stock en 1 unidad
            const newDisponibilidad = calcularDisponibilidad(newStock);

            // --- 8.3 Preparar Data y Navegar ---
            const updatedForm = {
                ...formData,
                imagen_url: publicUrlData.publicUrl || "",
                estado_ia: estadoIA, // Usamos estado_ia para claridad en el formulario
                stock: newStock.toString(), // Enviamos el nuevo stock como string
                disponibilidad: newDisponibilidad,
            };
            
            // Navegar de vuelta a la página de registro con los datos actualizados
            history.push("/tabs/registro/ia", { formData: updatedForm });

        } catch (error: any) {
            console.error("Error completo en guardado:", error);
            alert(`Error en el proceso de guardado: ${error.message}`);
        } finally {
            setLoading(false);
            setShowLoadingOverlay(false);
        }
    };

    // --- 9. RENDERIZADO DEL COMPONENTE (AJUSTADO) ---
    return (
        <IonPage>
            <IonContent className="ion-padding">
                
                {/* Mostrar código del producto actual (para referencia) */}
                <IonText color="medium"><p>Producto: <b>{formData.codigo || "Cargando..."}</b></p></IonText>

                {/* Estado del Modelo de IA */}
                <IonText color={modeloLite ? "success" : "danger"}>
                    <p style={{ textAlign: "center", marginBottom: "1rem" }}>
                        {modeloLite ? "Modelo de IA Listo" : "Cargando Modelo de IA..."}
                    </p>
                </IonText>


                {/* Botón para activar la cámara */}
                <IonButton expand="block" onClick={tomarFoto} disabled={loading || !modeloLite}>
                    📸 Tomar Foto
                </IonButton>

                {/* Muestra la imagen */}
                {image && (
                    <>
                        <IonImg 
                            src={image} 
                            alt="Foto tomada para análisis" 
                            style={{ 
                                marginTop: "1rem", 
                                border: estadoIA ? '3px solid green' : '3px solid gray',
                                borderRadius: '8px'
                            }} 
                        />
                        
                        {/* Muestra el resultado y el botón de confirmar */}
                        {estadoIA ? (
                            <div style={{ marginTop: "1rem" }}>
                                <IonText color="success"><h2 style={{ textAlign: "center" }}>Estado detectado: **{estadoIA.toUpperCase()}**</h2></IonText>
                                <IonButton 
                                    color="success" 
                                    expand="block" 
                                    onClick={guardarYVolver} 
                                    disabled={loading} 
                                    style={{ marginTop: "0.5rem" }}
                                >
                                    💾 Confirmar, Subir Imagen y Actualizar Stock
                                </IonButton>
                            </div>
                        ) : (
                            <IonText color="primary"><p style={{ textAlign: "center", marginTop: "1rem" }}>Analizando imagen...</p></IonText>
                        )}
                    </>
                )}


                {/* Muestra el botón de analizar solo si la imagen está pero la IA no se ha ejecutado */}
                {/* // Hemos movido la predicción a un useEffect para que se ejecute automáticamente
                // al tomar la foto (cuando 'image' cambia). Por lo tanto, este botón ya no es necesario.
                {image && !estadoIA && (
                    <IonButton color="secondary" expand="block" onClick={predecirEstadoLite} disabled={loading || !modeloLite} style={{ marginTop: "1rem" }}>
                        🔬 Analizar con IA
                    </IonButton>
                )} 
                */}

                {/* Componente de Ionic que muestra una pantalla de carga completa */}
                <IonLoading 
                    isOpen={showLoadingOverlay} 
                    message={loading ? "Analizando imagen..." : "Cargando modelo..."} 
                    duration={0} // duración 0 para control manual
                />
            </IonContent>
        </IonPage>
    );
}