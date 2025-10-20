import {
    IonPage,
    IonContent,
    IonButton,
    IonImg,
    IonSpinner,
    IonText,
} from "@ionic/react";
import { useState, useEffect } from "react";
// ✅ CORRECCIÓN 1: Importamos Capacitor para detectar la plataforma
import { Capacitor } from "@capacitor/core"; 
import { Camera, CameraResultType } from "@capacitor/camera";
import { createClient } from "@supabase/supabase-js";
import { useHistory, useLocation } from "react-router-dom";
import * as tf from "@tensorflow/tfjs";
import * as tflite from "@tensorflow/tfjs-tflite";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export default function IAImagen() {
    const history = useHistory();
    const location = useLocation();
    const formData = (location.state as any)?.formData || {};

    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [estadoIA, setEstadoIA] = useState<string | null>(null);
    const [modeloLite, setModeloLite] = useState<tflite.TFLiteModel | null>(null);

    // Cargar modelo TFLite al inicio
    useEffect(() => {
        const loadModelLite = async () => {
            setLoading(true);
            try {
                // Asegúrate que tu modelo está en la carpeta `public/ml/`
                const m = await tflite.loadTFLiteModel("/ml/modelo_final.lite");
                setModeloLite(m);
                console.log("✅ Modelo TFLite cargado correctamente");
            } catch (err) {
                console.error("❌ Error cargando modelo TFLite:", err);
                alert("Error al cargar el modelo TFLite.");
            }
            setLoading(false);
        };
        loadModelLite();
    }, []);

    // ✅ CORRECCIÓN 2: Función `tomarFoto` mejorada para ser multiplataforma
    const tomarFoto = async () => {
        try {
            // Detectamos si estamos en un dispositivo nativo (Android/iOS)
            const isNative = Capacitor.isNativePlatform();

            const foto = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                // Pedimos URI en nativo para ahorrar memoria, y DataUrl en web
                resultType: isNative ? CameraResultType.Uri : CameraResultType.DataUrl,
            });

            // Usamos `webPath`, Capacitor se encarga de que funcione en ambas plataformas
            if (foto.webPath) {
                setImage(foto.webPath);
            } else {
                // Como fallback para la web si webPath no estuviera
                setImage(foto.dataUrl || null);
            }
            
            setEstadoIA(null); // Resetea el análisis previo

        } catch (error) {
            console.log("El usuario canceló la toma de la foto.");
        }
    };

    // El resto de tus funciones (predecir y guardar) funcionan sin cambios
    // gracias a la magia de `webPath` de Capacitor.
    
    const predecirEstadoLite = async () => {
        if (!modeloLite || !image) {
            alert("Primero toma una foto y asegúrate de que el modelo esté cargado.");
            return;
        }

        setLoading(true);
        const img = new Image();
        img.src = image;

        img.onload = async () => {
            try {
                const tensor = tf.browser
                    .fromPixels(img)
                    .resizeNearestNeighbor([224, 224])
                    .toFloat()
                    .div(tf.scalar(255))
                    .expandDims(0);
                
                const output = (await modeloLite.predict(tensor)) as tf.Tensor;
                const scores = (await output.array()) as number[][];
                const idx = scores[0].indexOf(Math.max(...scores[0]));

                const etiquetas = ["Nuevo", "Usado", "Mal estado"];
                const resultado = etiquetas[idx] || "Desconocido";

                setEstadoIA(resultado);
                alert(`Estado detectado: ${resultado}`);
            } catch (error) {
                console.error("Error al predecir TFLite:", error);
                alert("Ocurrió un error al analizar la imagen con TFLite.");
            }
            setLoading(false);
        };
    };

    const guardarImagen = async () => {
        if (!image || !estadoIA) {
            alert("Toma una foto y ejecuta la IA antes de guardar.");
            return;
        }

        setLoading(true);
        
        // `fetch(image)` funciona con `webPath` en nativo y con `dataUrl` en web.
        const response = await fetch(image);
        const blob = await response.blob();

        const fileName = `productos/${formData.codigo}_${Date.now()}.png`;
        const { error } = await supabase.storage
            .from("imagenes-productos")
            .upload(fileName, blob);

        if (error) {
            console.error(error);
            alert("Error al subir imagen a Supabase.");
            setLoading(false);
            return;
        }

        const { data } = supabase.storage.from("imagenes-productos").getPublicUrl(fileName);
        const publicUrl = data.publicUrl || "";

        const updatedForm = {
            ...formData,
            imagen_url: publicUrl,
            estadoIA,
        };

        setLoading(false);
        history.push("/registro", { formData: updatedForm });
    };

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <IonButton expand="block" onClick={tomarFoto}>
                    Tomar Foto del Producto
                </IonButton>

                {image && (
                    <div style={{ marginTop: "1rem" }}>
                        <IonImg src={image} />
                    </div>
                )}

                {image && !estadoIA && (
                    <IonButton
                        color="secondary"
                        expand="block"
                        onClick={predecirEstadoLite}
                        disabled={loading || !modeloLite}
                    >
                        {loading ? <IonSpinner /> : "Analizar con IA"}
                    </IonButton>
                )}

                {estadoIA && (
                    <IonText>
                        <h2 style={{ textAlign: "center", marginTop: "1rem" }}>
                            Estado detectado: {estadoIA}
                        </h2>
                    </IonText>
                )}

                {estadoIA && (
                    <IonButton
                        color="success"
                        expand="block"
                        onClick={guardarImagen}
                        disabled={loading}
                    >
                        {loading ? <IonSpinner /> : "Guardar Imagen y Estado"}
                    </IonButton>
                )}
            </IonContent>
        </IonPage>
    );
}