import React, { useState, useEffect } from "react";
import {
    IonPage,
    IonContent,
    IonButton,
    IonImg,
    IonText,
    IonLoading,
    IonModal,
    IonIcon,
} from "@ionic/react";
import {
    Camera,
    CameraResultType,
    CameraSource,
    CameraDirection,
} from "@capacitor/camera";
import { useHistory, useLocation } from "react-router-dom";
import { checkmarkCircleOutline } from "ionicons/icons";

const API_CLASSIFY_URL =
    "https://inventario-ia-api-887072391939.us-central1.run.app/api/clasificar-producto";

interface FormData {
    codigo: string;
    nombre: string;
    marca: string;
    modelo: string;
    categoria_id: string;
    compatibilidad: string;
    observaciones: string;
    stock?: string;
    disponibilidad?: string;
    estado_ia?: string;
}

interface BackendResponse {
    status: "success" | "error";
    message: string;
    estado_clasificado?: string;
    stock_actual?: number;
}

const calcularDisponibilidad = (cantidad: number): string => {
    if (cantidad <= 0) return "Sin stock";
    if (cantidad <= 4) return "Baja disponibilidad";
    if (cantidad <= 10) return "Disponibilidad media";
    return "Alta disponibilidad";
};

const IAImage: React.FC = () => {
    const history = useHistory();
    const location = useLocation();
    const initialFormData =
        (location.state as { formData?: FormData })?.formData || ({} as FormData);

    const [formData] = useState<FormData>(initialFormData);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState("Listo para tomar la foto.");
    const [estadoIA, setEstadoIA] = useState<string | null>(null);
    const [showModalSuccess, setShowModalSuccess] = useState(false);

    // 🔁 Cierra el modal automáticamente después de 7 segundos
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (showModalSuccess) {
            timer = setTimeout(() => handleVolver(), 7000);
        }
        return () => clearTimeout(timer);
    }, [showModalSuccess]);

    const tomarFoto = async () => {
        try {
            setLoading(true);
            setStatusText("Abriendo cámara...");

            const foto = await Camera.getPhoto({
                quality: 85,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera,
                direction: CameraDirection.Rear,
            });

            if (!foto.base64String) {
                alert("No se pudo capturar la imagen.");
                setLoading(false);
                return;
            }

            const base64Image = foto.base64String;
            setImage(`data:image/jpeg;base64,${base64Image}`);
            setStatusText("Analizando imagen con IA...");

            await callBackendAPI(base64Image);
        } catch (e) {
            console.error("📷 Error al tomar la foto:", e);
            setStatusText("Error o cancelación de la cámara.");
        } finally {
            setLoading(false);
        }
    };

    const callBackendAPI = async (imageBase64: string) => {
        try {
            const requestData = {
                image_base64: imageBase64,
                codigo_barras: formData.codigo,
                nombre: formData.nombre,
                marca: formData.marca,
                modelo: formData.modelo,
                categoria_id: formData.categoria_id,
                compatibilidad: formData.compatibilidad,
                observaciones: formData.observaciones,
            };

            console.log("📦 Enviando datos a IA API:", requestData);

            const response = await fetch(API_CLASSIFY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestData),
            });

            const result: BackendResponse = await response.json();
            console.log("🔁 Respuesta del backend:", result);

            if (response.ok && result.status === "success") {
                const estadoDetectado =
                    result.estado_clasificado?.toLowerCase() || "desconocido";
                const nuevoStock = result.stock_actual || 0;
                const nuevaDisponibilidad = calcularDisponibilidad(nuevoStock);

                setEstadoIA(estadoDetectado);
                setStatusText("✅ Datos procesados y almacenados correctamente.");
                setShowModalSuccess(true);
            } else {
                throw new Error(result.message || "Error en el servidor IA");
            }
        } catch (error: any) {
            console.error("❌ Error en el backend:", error);
            alert(`❌ Error al procesar el producto: ${error.message}`);
            setStatusText("Ocurrió un error al guardar el producto.");
        }
    };

    const handleVolver = () => {
        setShowModalSuccess(false);
        history.push("/tabs/registro");
    };

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <IonText color="medium">
                    <p>
                        Producto: <b>{formData.codigo || "Cargando..."}</b>
                    </p>
                </IonText>

                <IonButton expand="block" onClick={tomarFoto} disabled={loading}>
                    📸 Tomar Foto y Analizar
                </IonButton>

                <p
                    style={{
                        textAlign: "center",
                        marginTop: "0.5rem",
                        color: "#007bff",
                    }}
                >
                    {statusText}
                </p>

                {image && (
                    <IonImg
                        src={image}
                        alt="Foto del producto"
                        style={{
                            marginTop: "1rem",
                            borderRadius: "8px",
                            border: estadoIA ? "3px solid green" : "3px solid gray",
                        }}
                    />
                )}

                <IonLoading isOpen={loading} message={"Procesando..."} duration={0} />

                <IonModal isOpen={showModalSuccess} backdropDismiss={false}>
                    <div
                        style={{
                            textAlign: "center",
                            padding: "2rem",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <IonIcon
                            icon={checkmarkCircleOutline}
                            color="success"
                            style={{ fontSize: "4rem", marginBottom: "1rem" }}
                        />
                        <IonText color="success">
                            <h2>Producto registrado correctamente</h2>
                            <p style={{ color: "#333", marginTop: "0.5rem" }}>
                                El estado, stock y disponibilidad fueron actualizados con éxito.
                            </p>
                            <p style={{ color: "#888", marginTop: "0.5rem" }}>
                                (Se cerrará automáticamente en 7 segundos)
                            </p>
                        </IonText>
                        <IonButton
                            color="success"
                            expand="block"
                            style={{ marginTop: "1.5rem" }}
                            onClick={handleVolver}
                        >
                            Volver ahora
                        </IonButton>
                    </div>
                </IonModal>
            </IonContent>
        </IonPage>
    );
};

export default IAImage;