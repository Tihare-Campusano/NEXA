import React, { useState, useEffect, useCallback } from "react";
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
}
 from "@capacitor/camera";
import { useHistory, useLocation } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import * as tf from "@tensorflow/tfjs";
import * as tflite from "@tensorflow/tfjs-tflite";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-wasm";

const MODEL_URL = "/modelo_final.tflite";

// 🧩 Inicializar Supabase UNA sola vez
let supabase: any;
if (!supabase) {
    supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string
    );
}

interface FormData {
    codigo: string;
    nombre: string;
    stock: string;
    [key: string]: any;
}

const IAImage: React.FC = () => {
    const history = useHistory();
    const location = useLocation();
    const formData =
        (location.state as { formData?: FormData })?.formData || ({} as FormData);

    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [estadoIA, setEstadoIA] = useState<string | null>(null);
    const [modeloLite, setModeloLite] = useState<tflite.TFLiteModel | null>(null);
    const [labels, setLabels] = useState<string[]>([]);
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

    // 🚀 Cargar modelo TFLite + labels.txt
    useEffect(() => {
        const loadModelAndLabels = async () => {
            setShowLoadingOverlay(true);
            try {
                // Configuración de Backend
                await tf.setBackend("webgl").catch(() => tf.setBackend("wasm"));
                await tf.ready();
                console.log("✅ Backend TensorFlow listo:", tf.getBackend());

                // Carga del modelo
                const model = await tflite.loadTFLiteModel(MODEL_URL);
                setModeloLite(model);
                console.log("✅ Modelo TFLite cargado correctamente:", model);

                // Cargar labels.txt
                const res = await fetch("/labels.txt");
                const text = await res.text();
                const labelsArr = text.trim().split("\n");
                setLabels(labelsArr);
                console.log("✅ Labels cargadas:", labelsArr);
            } catch (err) {
                console.error("❌ Error cargando modelo o labels:", err);
                alert("Error cargando el modelo o labels. Verifica que estén en /public.");
            } finally {
                setShowLoadingOverlay(false);
            }
        };

        loadModelAndLabels();
    }, []);

    // 📸 Tomar foto
    const tomarFoto = async () => {
        if (!modeloLite) {
            alert("El modelo aún no está listo.");
            return;
        }

        try {
            setLoading(true);
            const foto = await Camera.getPhoto({
                quality: 85,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera,
                direction: CameraDirection.Rear,
            });

            if (foto.base64String) {
                setImage(`data:image/jpeg;base64,${foto.base64String}`);
                setEstadoIA(null);
            } else {
                alert("No se pudo capturar la imagen.");
            }
        } catch (e) {
            console.warn("📷 Cámara cancelada o error:", e);
        } finally {
            setLoading(false);
        }
    };

    // 🧠 Predicción con el modelo
    const predecirEstadoLite = useCallback(async () => {
        if (!modeloLite || !image || labels.length === 0) return;

        setShowLoadingOverlay(true);
        setLoading(true);

        let inputTensor: tf.Tensor | null = null;
        let outputTensor: tf.Tensor | null = null; // Declaración para limpieza en finally

        try {
            const img = new Image();
            img.src = image;

            // Esperar a que la imagen se cargue en el elemento HTML
            await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                    console.log("✅ Imagen cargada en elemento HTML. Dimensiones:", img.width, "x", img.height);
                    resolve();
                };
                img.onerror = (e) => {
                    console.error("❌ Error al cargar la imagen en elemento HTML", e);
                    reject(new Error("Error al cargar la imagen para el análisis."));
                };
            });
            
            // Preprocesar imagen [-1,1] para MobileNetV2
            inputTensor = tf.tidy(() =>
                tf.browser
                    .fromPixels(img)
                    .resizeBilinear([224, 224])
                    .toFloat()
                    .div(tf.scalar(127.5))
                    .sub(tf.scalar(1))
                    .expandDims(0)
            );
            console.log("✅ Tensor de entrada creado. Shape:", inputTensor.shape);

            let resultado: string | null = null;
            let scores: number[] = [];

            // Opción 1: Usar classify() si está disponible (tflite/tfjs-models)
            if (typeof (modeloLite as any).classify === "function") {
                console.log("Intentando usar classify()...");
                const output = await (modeloLite as any).classify(inputTensor);
                if (output && output.length > 0) {
                    const best = Array.isArray(output) ? output[0] : output;
                    resultado = best.className || best.label || "Desconocido";
                    scores = best.probabilities || best.scores || [];
                    console.log("Resultado de classify:", resultado, scores);
                }
            }

            // Opción 2: Fallback a predict() si classify no funcionó
            if (!resultado && typeof (modeloLite as any).predict === "function") {
                console.log("Recurriendo a predict()...");
                // Asignamos el resultado de predict al outputTensor
                outputTensor = (modeloLite as any).predict(inputTensor) as tf.Tensor;
                
                if (outputTensor) {
                    // Verificamos la forma (debería ser [1, N_CLASES])
                    console.log("Tensor de salida Shape:", outputTensor.shape);
                    
                    scores = Array.from(outputTensor.dataSync());
                    // NO HACEMOS dispose aquí, lo hacemos en el finally
                    
                    if (scores.length === labels.length) {
                        const maxIndex = scores.indexOf(Math.max(...scores));
                        resultado = labels[maxIndex] || "Desconocido (Índice fuera de rango)";
                        console.log(`Resultado de predict: ${resultado}. Índice: ${maxIndex}/${labels.length}`);
                    } else {
                         console.error(`❌ El modelo predice ${scores.length} clases, pero hay ${labels.length} labels.`);
                         throw new Error(`Desajuste: Clases del modelo (${scores.length}) != Labels (${labels.length}).`);
                    }
                } else {
                    // Mensaje de error mejorado para el fallo de predict()
                    throw new Error("El modelo TFLite retornó un tensor de salida nulo. Revise la compatibilidad del modelo.");
                }
            }
            
            if (!resultado) {
                throw new Error("No se pudo determinar la clase después de ambos intentos.");
            }

            setEstadoIA(resultado);
            console.log("✅ Estado IA detectado final:", resultado);

        } catch (error) {
            console.error("❌ Error en la predicción:", error);
            // Mostrar el mensaje de error original
            alert(`No se pudo analizar la imagen. Verifica que el modelo y labels estén correctos. Detalle: ${(error as Error).message}`);
        } finally {
            // Limpieza fundamental: liberar memoria de todos los tensores
            if (inputTensor) tf.dispose(inputTensor);
            if (outputTensor) tf.dispose(outputTensor); // Limpieza del tensor de salida
            setLoading(false);
            setShowLoadingOverlay(false);
        }
    }, [modeloLite, image, labels]);

    useEffect(() => {
        if (image && modeloLite && labels.length > 0) predecirEstadoLite();
    }, [image, modeloLite, labels, predecirEstadoLite]);

    // 📦 Calcular disponibilidad
    const calcularDisponibilidad = (cantidad: number): string => {
        if (cantidad <= 0) return "Sin stock";
        if (cantidad <= 4) return "Baja disponibilidad";
        if (cantidad <= 10) return "Disponibilidad media";
        return "Alta disponibilidad";
    };

    // 💾 Guardar resultado
    const guardarYVolver = async () => {
        if (!image || !estadoIA || !formData.codigo) {
            alert("Falta información para guardar.");
            return;
        }

        setLoading(true);
        setShowLoadingOverlay(true);

        try {
            // Obtiene el blob de la imagen
            const blob = await (await fetch(image)).blob();
            const fileName = `productos/${formData.codigo}_${Date.now()}.png`;

            // 1. Subir la imagen a Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("imagenes-productos")
                .upload(fileName, blob, { cacheControl: "3600", upsert: false });

            if (uploadError) throw uploadError;

            // 2. Obtener la URL pública
            const { data: publicUrlData } = supabase.storage
                .from("imagenes-productos")
                .getPublicUrl(fileName);

            // 3. Calcular nuevo stock y disponibilidad
            const currentStock = parseInt(formData.stock || "0", 10);
            const newStock = currentStock + 1;
            const newDisponibilidad = calcularDisponibilidad(newStock);

            // 4. Preparar datos actualizados
            const updatedForm = {
                ...formData,
                imagen_url: publicUrlData.publicUrl,
                estado_ia: estadoIA,
                stock: newStock.toString(),
                disponibilidad: newDisponibilidad,
            };

            console.log("✅ Datos listos para enviar:", updatedForm);
            // 5. Navegar de vuelta con los datos
            history.push("/tabs/registro/ia", { formData: updatedForm });
        } catch (error: any) {
            console.error("❌ Error guardando:", error);
            alert("Error guardando los datos: " + error.message);
        } finally {
            setLoading(false);
            setShowLoadingOverlay(false);
        }
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

                <IonText color={modeloLite ? "success" : "warning"}>
                    <p style={{ textAlign: "center" }}>
                        {modeloLite ? "✅ IA lista para usar" : "⏳ Cargando modelo..."}
                    </p>
                </IonText>

                <IonButton
                    expand="block"
                    onClick={tomarFoto}
                    disabled={loading || !modeloLite}
                >
                    📸 Tomar Foto
                </IonButton>

                {image && (
                    <>
                        <IonImg
                            src={image}
                            alt="Foto del producto"
                            style={{
                                marginTop: "1rem",
                                borderRadius: "8px",
                                border:
                                    estadoIA === null
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
                                    onClick={guardarYVolver}
                                    disabled={loading}
                                >
                                    💾 Guardar y Actualizar Stock
                                </IonButton>
                            </div>
                        ) : (
                            <IonText color="primary">
                                <p style={{ textAlign: "center", marginTop: "1rem" }}>
                                    Analizando imagen...
                                </p>
                            </IonText>
                        )}
                    </>
                )}

                <IonLoading
                    isOpen={showLoadingOverlay}
                    message={
                        loading
                            ? "Analizando imagen..."
                            : "Cargando modelo de inteligencia artificial..."
                    }
                    duration={0}
                />
            </IonContent>
        </IonPage>
    );
};

export default IAImage;