import { IonPage, IonContent } from "@ionic/react";
import HeaderApp from "../../components/header_app";
import { FaBarcode } from "react-icons/fa";

export default function RegistroPistola() {
    return (
        <IonPage>
            <HeaderApp icon={<FaBarcode />} title="Registro con pistola" />
            <IonContent>
                <div style={{ padding: "1rem" }}>
                    <h2 style={{ textAlign: "center" }}>Aquí irá el registro con pistola</h2>
                    {/* 🔹 Aquí luego puedes agregar la lógica de lectura de código de barras */}
                </div>
            </IonContent>
        </IonPage>
    );
}
