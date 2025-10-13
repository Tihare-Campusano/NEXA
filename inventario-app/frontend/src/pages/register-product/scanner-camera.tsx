import { IonPage, IonContent, IonButton } from "@ionic/react";
import HeaderApp from "../../components/header_app";
import { FaClipboard, FaBarcode, FaCamera } from "react-icons/fa";
import { useHistory } from "react-router-dom";
import Botones from "../../components/register-product/botones";

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
                    <Botones />
                    <h2 style={{ textAlign: "center" }}>Registro con cámara</h2>
                </div>
            </IonContent>
        </IonPage>
    );
}
