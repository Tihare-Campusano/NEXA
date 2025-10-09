import { IonPage, IonContent, IonButton } from "@ionic/react";
import { FaClipboard, FaBarcode, FaCamera } from "react-icons/fa";
import HeaderApp from "../../components/header_app";
import { useHistory } from "react-router-dom";

export default function Registro() {
  const history = useHistory();

  return (
    <IonPage>
      <HeaderApp
        icon={<FaClipboard size={28} className="text-green-400" />}
        title="Registro de productos"
      />
      <IonContent>
        <div style={{ padding: "1rem" }}>
          <br />
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

          <h2 style={{ textAlign: "center" }}>Registro manual</h2>
        </div>

        <div>
          <IonButton color="warning" expand="block" style={{ flex: 1 }}>
            Siguiente
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}