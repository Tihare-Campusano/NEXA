import {
    IonPage,
    IonContent,
    IonButton,
    IonImg,
    IonSpinner,
    IonText,
} from "@ionic/react";
import { useState, useEffect } from "react";
import { Camera, CameraResultType } from "@capacitor/camera";
import { createClient } from "@supabase/supabase-js";
import * as tf from "@tensorflow/tfjs";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export default function IAImagen({ formData }: { formData: any }) {
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [estadoIA, setEstadoIA] = useState<string | null>(null);
    const [modelo, setModelo] = useState<tf.LayersModel | null>(null);

    // Cargar modelo al inicio
    useEffect(() => {
        const loadModel = async () => {
            setLoading(true);
            try {
                const m = await tf.loadLayersModel("/modelo_IA_web/model.json");
                setModelo(m);
            } catch (err) {
                console.error("Error cargando modelo IA:", err);
            }
            setLoading(false);
        };
        loadModel();
    }, []);

    const tomarFoto = async () => {
        const foto = await Camera.getPhoto({
            resultType: CameraResultType.DataUrl,
            quality: 90,
            allowEditing: false,
        });
        setImage(foto.dataUrl || null);
    };

    const predecirEstado = async () => {
        if (!modelo || !image) return;

        setLoading(true);

        const img = new Image();
        img.src = image;
        img.onload = async () => {
            const tensor = tf.browser
                .fromPixels(img)
                .resizeNearestNeighbor([224, 224])
                .toFloat()
                .expandDims(0)
                .div(tf.scalar(255));

            const pred = modelo.predict(tensor) as tf.Tensor;
            const scores = pred.arraySync() as number[][];
            const idx = scores[0].indexOf(Math.max(...scores[0]));

            const estados = ["Nuevo", "Usado", "Mal estado"];
            setEstadoIA(estados[idx]);
            setLoading(false);
        };
    };

    const guardarImagen = async () => {
        if (!image || !estadoIA) return;

        setLoading(true);

        const fileName = `productos/${formData.codigo}_${Date.now()}.png`;
        const { error } = await supabase.storage
            .from("imagenes-productos")
            .upload(fileName, await fetch(image).then(r => r.blob()));

        if (error) {
            console.error(error);
            setLoading(false);
            return;
        }

        // Obtener URL pública correctamente
        const { data } = supabase.storage
            .from("imagenes-productos")
            .getPublicUrl(fileName);

        if (!data || !data.publicUrl) {
            console.error("No se pudo obtener la URL pública");
            setLoading(false);
            return;
        }

        formData.imagen_url = data.publicUrl;
        formData.estadoIA = estadoIA;

        setLoading(false);
        alert("Imagen guardada y estado IA detectado: " + estadoIA);
    };

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <IonButton onClick={tomarFoto}>Tomar Foto del Producto</IonButton>

                {image && <IonImg src={image} />}

                {image && !estadoIA && (
                    <IonButton color="secondary" onClick={predecirEstado}>
                        {loading ? <IonSpinner /> : "Detectar Estado IA"}
                    </IonButton>
                )}

                {estadoIA && (
                    <IonText>
                        <h2>Estado detectado: {estadoIA}</h2>
                    </IonText>
                )}

                {estadoIA && (
                    <IonButton color="success" onClick={guardarImagen}>
                        {loading ? <IonSpinner /> : "Guardar Imagen y Estado"}
                    </IonButton>
                )}
            </IonContent>
        </IonPage>
    );
}
