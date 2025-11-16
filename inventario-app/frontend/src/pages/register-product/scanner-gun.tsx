import { IonPage, IonContent } from "@ionic/react";
import HeaderApp from "../../components/header_app";
import { FaClipboard } from "react-icons/fa";
import Botones from "../../components/register-product/botones";

export default function RegistroPistola() {

    return (
        <IonPage>
            <HeaderApp
                icon={<FaClipboard size={28} className="text-green-400" />}
                title="Registro de productos"
            />

            <IonContent>
                <div style={{ padding: "1rem" }}>
                    <Botones />
                    <h2 style={{ textAlign: "center" }}>Registro con pistola</h2>
                </div>
            </IonContent>
        </IonPage>
    );
}
