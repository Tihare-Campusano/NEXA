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
// Importamos Source y Prompt
import { Camera, CameraResultType, CameraSource, CameraDirection } from "@capacitor/camera";
import { createClient } from "@supabase/supabase-js";
import { useHistory, useLocation } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import * as tflite from "@tensorflow/tfjs-tflite";
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-wasm'; 
import MODEL_URL from '../../../../../modelo_ia/modelo_final.tflite';

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
                // **CORRECCIÓN DE ESTABILIDAD 1: Inicialización de Backend**
                // Intentamos usar WASM en nativo para mayor estabilidad
                if (Capacitor.isNativePlatform()) {
                    await tf.setBackend('wasm');
                }
                await tf.ready();
                console.log(`✅ Backend de TensorFlow listo: ${tf.getBackend()}`);

                // Cargamos el modelo TFLite.
                const m = await tflite.loadTFLiteModel(MODEL_URL);
                
                setModeloLite(m);
                console.log("✅ Modelo TFLite cargado correctamente");
            } catch (err) {
                console.error("❌ Error cargando modelo TFLite. Verifica la ruta o el archivo:", err);
            }
            setShowLoadingOverlay(false);
        };
        loadModelLite();
    }, []);

    // --- 6. FUNCIÓN PARA TOMAR FOTO (CORREGIDA) ---
    const tomarFoto = async () => {
        // Reiniciar estados de análisis al tomar nueva foto
        setEstadoIA(null); 
        setImage(null);
        setLoading(true);

        try {
            const isNative = Capacitor.isNativePlatform();
            
            const foto = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                // ** CORRECCIÓN 2: Usamos Base64 en nativo para evitar problemas de permisos**
                resultType: isNative ? CameraResultType.Base64 : CameraResultType.DataUrl, 
                
                // Forzamos la apertura de la cámara
                source: CameraSource.Camera,
                direction: CameraDirection.Rear,
            });

            let imageUrl: string | null = null;
            
            if (foto.base64String) {
                // Si Base64 fue exitoso, construimos el DataURL
                imageUrl = `data:image/jpeg;base64,${foto.base64String}`;
            } else if (foto.dataUrl) {
                imageUrl = foto.dataUrl;
            } else if (foto.webPath) {
                imageUrl = foto.webPath;
            }
            
            setImage(imageUrl);

        } catch (e) {
            console.log("El usuario canceló la toma de la foto o hubo un error en la cámara.", e);
        } finally {
            setLoading(false);
        }
    };

    // ✅ Función para calcular la disponibilidad (SIN CAMBIOS)
    const calcularDisponibilidad = (cantidad: number): string => {
        if (cantidad <= 0) return "Sin stock";
        if (cantidad >= 1 && cantidad <= 4) return "Baja disponibilidad";
        if (cantidad >= 5 && cantidad <= 10) return "Disponibilidad media";
        return "Alta disponibilidad";
    };

    // --- 7. FUNCIÓN PARA PREDECIR CON LA IA (CORRECCIÓN CRÍTICA DE TFLITE) ---
    // Usamos useEffect para que la predicción se ejecute automáticamente
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
        img.crossOrigin = "anonymous"; // Recomendado para evitar problemas CORS
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
        }).catch(err => {
            // Manejar error de carga de imagen si ocurre
            alert("No se pudo cargar la imagen: " + err.message);
            setLoading(false);
            setShowLoadingOverlay(false);
            return; // Salir de la función si la imagen no carga
        });
        
        let tensor: tf.Tensor | null = null;
        let output: tf.Tensor | null = null;

        try {
            await tf.ready(); // Asegurar que TF está listo

            // 1. Preprocesamiento: Cargar, redimensionar, convertir a float
            // **CORRECCIÓN CRÍTICA DE TFLITE 3: Flujo de Tensor**
            tensor = tf.browser.fromPixels(img)
                .resizeNearestNeighbor([224, 224])
                .toFloat();
            
            // ⚠️ NORMALIZACIÓN: **Esto DEBE coincidir con el entrenamiento de tu modelo.**
            // Asumimos normalización a [0, 1] (dividir por 255).
            // Si el error persiste, prueba: const normalizedTensor = tensor.div(tf.scalar(127.5)).sub(tf.scalar(1));
            const normalizedTensor = tensor.div(tf.scalar(255)); 
            
            // Añadir la dimensión de batch (1, 224, 224, 3)
            const finalTensor = normalizedTensor.expandDims(0); 

            console.log("Dimensiones del tensor de entrada:", finalTensor.shape);
            
            // 2. Predicción
            output = modeloLite.predict(finalTensor) as tf.Tensor;

            if (!output) {
                throw new Error("La predicción del modelo devolvió un resultado nulo.");
            }

            // 3. Postprocesamiento: Obtener el índice de la clase con mayor probabilidad
            const scores = (await output.array()) as number[][];
            const idx = scores[0].indexOf(Math.max(...scores[0]));
            
            // Etiquetado de resultados (Verifica que este orden sea CORRECTO: 0=mal_estado, 1=nuevo, 2=usado)
            const etiquetas = ["mal_estado", "nuevo", "usado"];  
            const resultado = etiquetas[idx] || "Desconocido";

            setEstadoIA(resultado);
            console.log(`Estado detectado por IA: ${resultado}`);  
            

        } catch (error) {
            console.error("❌ Error al predecir con TFLite. Probablemente un problema de preprocesamiento o compatibilidad.", error);
            // Mostrar el mensaje de error original en la app
            alert("Ocurrió un error al analizar la imagen. Esto puede ser por la operación TFLite.");  
        } finally {
            // **CORRECCIÓN CRÍTICA DE TFLITE 4: Liberación de Memoria**
            // Es vital liberar los tensores para evitar errores de memoria en móvil.
            if (tensor) tensor.dispose();
            if (output) output.dispose();
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
            const currentStock = parseInt(formData.stock || "0", 10);
            const newStock = currentStock + 1; // Incrementamos el stock en 1 unidad
            const newDisponibilidad = calcularDisponibilidad(newStock);

            // --- 8.3 Preparar Data y Navegar ---
            const updatedForm = {
                ...formData,
                imagen_url: publicUrlData.publicUrl || "",
                estado_ia: estadoIA,
                stock: newStock.toString(),
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
                        {modeloLite ? "✅ Modelo de IA Listo" : "⏳ Cargando Modelo de IA..."}
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