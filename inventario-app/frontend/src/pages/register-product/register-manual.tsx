import { IonPage, IonContent, IonButton } from "@ionic/react";
import { FaClipboard } from "react-icons/fa";
import HeaderApp from "../../components/header_app";

export default function Registro() {
  return (
    <IonPage>
      {/* 🔹 Header reutilizable */}
      <HeaderApp
        icon={<FaClipboard size={28} className="text-green-400" />}
        title="Registro de productos"
      />
      <IonContent>
        <div style={{ padding: "1rem" }}>
          <br />
          {/* 🔹 Botones en línea */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <IonButton color="primary" expand="block" style={{ flex: 1 }}>
              Registro manual
            </IonButton>
            <IonButton color="secondary" expand="block" style={{ flex: 1 }}>
              Registro con pistola
            </IonButton>
            <IonButton color="tertiary" expand="block" style={{ flex: 1 }}>
              Registro con cámara
            </IonButton>
          </div>
          <h2 style={{ textAlign: "center" }}>Registro manual</h2>
        </div>
      </IonContent>
    </IonPage>
  );
}