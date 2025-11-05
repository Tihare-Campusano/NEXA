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
import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType } from "@capacitor/camera";
import { createClient } from "@supabase/supabase-js";
import { useHistory, useLocation } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import * as tflite from "@tensorflow/tfjs-tflite";
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-wasm';

// --- 2. CONFIGURACIÓN DE SUPABASE ---
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

                // Cargamos el modelo TFLite. Asegúrate que la ruta sea correcta.
                // Si el modelo está en la carpeta 'public/ml', esta ruta es correcta.
                const m = await tflite.loadTFLiteModel("../modelo_ia/modelo_final.tflite");
                
                setModeloLite(m);
                console.log("✅ Modelo TFLite cargado correctamente");
            } catch (err) {
                console.error("❌ Error cargando modelo TFLite:", err);
                alert("Error al cargar el modelo de IA. Revisa la consola.");
            }
            setShowLoadingOverlay(false);
        };
        loadModelLite();
    }, []);

    // --- 6. FUNCIÓN PARA TOMAR FOTO ---
    const tomarFoto = async () => {
        // Reiniciar estados de análisis al tomar nueva foto
        setEstadoIA(null); 
        setLoading(true);

        try {
            const isNative = Capacitor.isNativePlatform();
            
            const foto = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: isNative ? CameraResultType.Uri : CameraResultType.DataUrl,
            });

            setImage(foto.webPath || foto.dataUrl || null);
        } catch (e) {
            console.log("El usuario canceló la toma de la foto o hubo un error en la cámara.", e);
        } finally {
            setLoading(false);
        }
    };

    // ✅ NUEVO: Función para calcular la disponibilidad según las reglas especificadas.
    const calcularDisponibilidad = (cantidad: number): string => {
        if (cantidad <= 0) return "Sin stock";
        if (cantidad >= 1 && cantidad <= 4) return "Baja disponibilidad";
        if (cantidad >= 5 && cantidad <= 10) return "Disponibilidad media";
        return "Alta disponibilidad"; // Para 11 en adelante
    };

    // --- 7. FUNCIÓN PARA PREDECIR CON LA IA ---
    const predecirEstadoLite = async () => {
        if (!modeloLite || !image) return;

        setLoading(true);
        setShowLoadingOverlay(true);

        const img = new Image();
        img.src = image;

        img.onload = async () => {
            let output: tf.Tensor | null = null;
            try {
                await tf.ready();

                // 1. Preprocesamiento: Cargar, redimensionar, convertir a float y normalizar
                const tensor = tf.browser.fromPixels(img)
                    .resizeNearestNeighbor([224, 224])
                    .toFloat().div(tf.scalar(255)) // Normalizar a [0, 1]
                    .expandDims(0); // Añadir la dimensión de batch (1, 224, 224, 3)

                // 2. Predicción
                output = modeloLite.predict(tensor) as tf.Tensor;

                if (!output) {
                    throw new Error("La predicción del modelo devolvió un resultado nulo.");
                }

                // 3. Postprocesamiento: Obtener el índice de la clase con mayor probabilidad
                const scores = (await output.array()) as number[][];
                const idx = scores[0].indexOf(Math.max(...scores[0]));
                
                // ❗ ASUMIMOS ESTE ORDEN DE ETIQUETAS (ALFABÉTICO basado en tus clases)
                // Debes verificar el orden real que tu modelo está usando.
                const etiquetas = ["mal_estado", "nuevo", "usado"]; 
                const resultado = etiquetas[idx] || "Desconocido";

                setEstadoIA(resultado);
                alert(`Estado detectado: ${resultado}`);

            } catch (error) {
                console.error("Error al predecir:", error);
                alert("Ocurrió un error al analizar la imagen. Esto puede ser por la operación TFLite.");
            } finally {
                if (output) output.dispose(); // Limpieza de memoria del tensor
                setLoading(false);
                setShowLoadingOverlay(false);
            }
        };
        
        img.onerror = () => {
            alert("No se pudo cargar la imagen para analizar.");
            setLoading(false);
            setShowLoadingOverlay(false);
        };
    };
    
    // --- 8. FUNCIÓN PARA GUARDAR Y VOLVER AL FORMULARIO ---
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
            console.error("Error completo:", error);
            alert(`Error en el proceso de guardado: ${error.message}`);
        } finally {
            setLoading(false);
            setShowLoadingOverlay(false);
        }
    };

    // --- 9. RENDERIZADO DEL COMPONENTE (LO QUE SE VE EN PANTALLA) ---
    return (
        <IonPage>
            <IonContent className="ion-padding">
                
                {/* Mostrar código del producto actual (para referencia) */}
                <IonText color="medium"><p>Producto: <b>{formData.codigo || "Cargando..."}</b></p></IonText>

                {/* Botón para activar la cámara */}
                <IonButton expand="block" onClick={tomarFoto} disabled={loading}>
                    📸 Tomar Foto
                </IonButton>

                {/* Muestra la imagen */}
                {image && <IonImg src={image} style={{ marginTop: "1rem" }} />}
                
                {/* Muestra el botón de analizar */}
                {image && !estadoIA && (
                    <IonButton 
                        color="secondary" 
                        expand="block" 
                        onClick={predecirEstadoLite} 
                        // Deshabilitar si está cargando o si el modelo aún no está listo
                        disabled={loading || !modeloLite} 
                        style={{ marginTop: "1rem" }}
                    >
                        🔬 Analizar con IA
                    </IonButton>
                )}

                {/* Muestra el resultado y el botón de confirmar */}
                {estadoIA && (
                    <>
                        <IonText><h2 style={{ textAlign: "center", marginTop: "1rem" }}>Estado detectado: **{estadoIA}**</h2></IonText>
                        <IonButton 
                            color="success" 
                            expand="block" 
                            onClick={guardarYVolver} 
                            disabled={loading} 
                            style={{ marginTop: "1rem" }}
                        >
                            💾 Confirmar, Subir Imagen y Actualizar Stock
                        </IonButton>
                    </>
                )}

                {/* Componente de Ionic que muestra una pantalla de carga completa */}
                <IonLoading isOpen={showLoadingOverlay} message={"Procesando..."} />
            </IonContent>
        </IonPage>
    );
}