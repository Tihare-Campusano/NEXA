import { IonPage, IonContent } from "@ionic/react";
import HeaderApp from "../../components/header_app";
import { FaCamera } from "react-icons/fa";

export default function RegistroCamara() {
    return (
        <IonPage>
            <HeaderApp icon={<FaCamera />} title="Registro con cámara" />
            <IonContent>
                <div style={{ padding: "1rem" }}>
                    <h2 style={{ textAlign: "center" }}>Aquí irá el registro con cámara</h2>
                    {/* 🔹 Aquí luego puedes agregar la lógica de captura de cámara */}
                </div>
            </IonContent>
        </IonPage>
    );
}
