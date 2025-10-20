import {
  IonPage,
  IonContent,
  IonButton,
} from "@ionic/react";
import { FaClipboard } from "react-icons/fa";
import HeaderApp from "../../components/header_app";
import FormularioRegistro from "../../components/register-product/product-form";
import { useHistory } from "react-router-dom";
import Botones from "../../components/register-product/botones";

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
          <Botones />
          <h2 style={{ textAlign: "center" }}>Registro manual</h2>
          {/* 🧩 Aquí se llama al formulario */}
          <FormularioRegistro />
        </div>
      </IonContent>
    </IonPage>
  );
}