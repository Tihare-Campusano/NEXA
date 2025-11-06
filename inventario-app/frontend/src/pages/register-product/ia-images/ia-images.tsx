// IAImagen.tsx - Versión optimizada para móviles Android + TFLite
import {
    IonPage,
    IonContent,
    IonButton,
    IonImg,
    IonText,
    IonLoading,
} from "@ionic/react";
import React, { useState, useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import {
    Camera,
    CameraResultType,
    CameraSource,
    CameraDirection,
} from "@capacitor/camera";
import { createClient } from "@supabase/supabase-js";
import { useHistory, useLocation } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import * as tflite from "@tensorflow/tfjs-tflite";
import "@tensorflow/tfjs-backend-wasm";

const MODEL_URL = "/modelo_final.tflite";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

interface FormData {
    codigo: string;
    nombre: string;
    stock: string;
    [key: string]: any;
}

export default function IAImagen() {
    const history = useHistory();
    const location = useLocation();
    const formData =
        (location.state as { formData?: FormData })?.formData || ({} as FormData);

    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [estadoIA, setEstadoIA] = useState<string | null>(null);
    const [modeloLite, setModeloLite] = useState<tflite.TFLiteModel | null>(null);
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

    // --- Cargar modelo de IA ---
    useEffect(() => {
        const loadModelLite = async () => {
            setShowLoadingOverlay(true);
            try {
                await tf.setBackend("wasm");
                await tf.ready();

                console.log(`✅ Backend TensorFlow listo: ${tf.getBackend()}`);

                const m = await tflite.loadTFLiteModel(MODEL_URL);
                setModeloLite(m);

                console.log("✅ Modelo TFLite cargado correctamente");
            } catch (err) {
                console.error("❌ Error cargando modelo TFLite:", err);
                alert(
                    "Error cargando el modelo de IA. Verifica que 'modelo_final.tflite' esté en /public."
                );
            } finally {
                setShowLoadingOverlay(false);
            }
        };

        loadModelLite();
    }, []);

    // --- Tomar foto ---
    const tomarFoto = async () => {
        if (!modeloLite) {
            alert("El modelo de IA aún no está listo.");
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

    const calcularDisponibilidad = (cantidad: number): string => {
        if (cantidad <= 0) return "Sin stock";
        if (cantidad <= 4) return "Baja disponibilidad";
        if (cantidad <= 10) return "Disponibilidad media";
        return "Alta disponibilidad";
    };

    // --- Predicción IA ---
    const predecirEstadoLite = useCallback(async () => {
        if (!modeloLite || !image) return;

        setShowLoadingOverlay(true);
        setLoading(true);

        try {
            const img = new Image();
            img.src = image;

            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = (e) => reject(e);
            });

            const resultado = await tf.tidy(() => {
                const tensor = tf.browser
                    .fromPixels(img)
                    .resizeBilinear([224, 224])
                    .toFloat()
                    .div(tf.scalar(127.5))
                    .sub(tf.scalar(1))
                    .expandDims(0);

                const rawOutput = modeloLite.predict(tensor) as Record<string, tf.Tensor>;
                const outputKey =
                    Object.keys(rawOutput).find((k) =>
                        ["output", "softmax"].some((s) => k.toLowerCase().includes(s))
                    ) || Object.keys(rawOutput)[0];

                const scoresTensor = rawOutput[outputKey];
                const scores = scoresTensor.dataSync();
                const idx = scores.indexOf(Math.max(...scores));

                const etiquetas = ["mal_estado", "nuevo", "usado"];
                return etiquetas[idx] || "Desconocido";
            });

            setEstadoIA(resultado);
            console.log("✅ Estado IA:", resultado);
        } catch (error) {
            console.error("❌ Error IA:", error);
            alert("No se pudo analizar la imagen. Inténtalo nuevamente.");
        } finally {
            setLoading(false);
            setShowLoadingOverlay(false);
        }
    }, [modeloLite, image]);

    useEffect(() => {
        if (image && modeloLite) predecirEstadoLite();
    }, [image, modeloLite, predecirEstadoLite]);

    // --- Guardar y volver ---
    const guardarYVolver = async () => {
        if (!image || !estadoIA || !formData.codigo) {
            alert("Falta información para guardar.");
            return;
        }

        setLoading(true);
        setShowLoadingOverlay(true);

        try {
            const blob = await (await fetch(image)).blob();
            const fileName = `productos/${formData.codigo}_${Date.now()}.png`;

            const { error: uploadError } = await supabase.storage
                .from("imagenes-productos")
                .upload(fileName, blob, { cacheControl: "3600", upsert: false });

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from("imagenes-productos")
                .getPublicUrl(fileName);

            const currentStock = parseInt(formData.stock || "0", 10);
            const newStock = currentStock + 1;
            const newDisponibilidad = calcularDisponibilidad(newStock);

            const updatedForm = {
                ...formData,
                imagen_url: publicUrlData.publicUrl,
                estado_ia: estadoIA,
                stock: newStock.toString(),
                disponibilidad: newDisponibilidad,
            };

            history.push("/tabs/registro/ia", { formData: updatedForm });
        } catch (error: any) {
            console.error("Error guardando:", error);
            alert("Error guardando los datos: " + error.message);
        } finally {
            setLoading(false);
            setShowLoadingOverlay(false);
        }
    };

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
                                border: estadoIA ? "3px solid #28a745" : "3px solid gray",
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
                        loading ? "Analizando imagen..." : "Cargando modelo de inteligencia artificial..."
                    }
                    duration={0}
                />
            </IonContent>
        </IonPage>
    );
}
