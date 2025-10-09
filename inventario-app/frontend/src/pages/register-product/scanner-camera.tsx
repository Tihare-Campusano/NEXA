import { IonPage, IonContent, IonButton } from "@ionic/react";
import HeaderApp from "../../components/header_app";
import { FaClipboard, FaBarcode, FaCamera } from "react-icons/fa";
import { useHistory } from "react-router-dom";

export default function RegistroCamara() {
    const history = useHistory();

    return (
        <IonPage>
            <HeaderApp
                icon={<FaClipboard size={28} className="text-green-400" />}
                title="Registro de productos"
            />
            <IonContent>
                <div style={{ padding: "1rem" }}>
                    {/* 🔹 Botones en línea */}
                    <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                        <IonButton
                            color="primary"
                            expand="block"
                            style={{ flex: 1 }}
                            onClick={() => history.push("/registro")}
                        >
                            Registro manual
                        </IonButton>

                        <IonButton
                            color="secondary"
                            expand="block"
                            style={{ flex: 1 }}
                            onClick={() => history.push("/registro/pistola")}
                        >
                            Registro con pistola
                        </IonButton>

                        <IonButton
                            color="tertiary"
                            expand="block"
                            style={{ flex: 1 }}
                            onClick={() => history.push("/registro/camera")}
                        >
                            Registro con cámara
                        </IonButton>
                    </div>

                    <h2 style={{ textAlign: "center" }}>Registro con cámara</h2>
                    {/* 🔹 Aquí luego puedes agregar la lógica de captura de cámara */}
                </div>
            </IonContent>
        </IonPage>
    );
}
