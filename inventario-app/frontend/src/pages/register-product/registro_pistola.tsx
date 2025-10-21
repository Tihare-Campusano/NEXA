import { IonPage, IonContent, IonButton, IonInput, IonLabel, IonItem } from "@ionic/react";
import HeaderApp from "../../components/header_app";
import { useState } from "react";
import { FaBarcode } from "react-icons/fa";
import { supabase } from "../../supabaseClient";

export default function RegistroPistola() {
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Cuando el usuario escanee o escriba el código
  const handleScan = async (e: any) => {
    const valor = e.detail?.value || e.target.value;
    setCodigo(valor);

    // Si el código tiene longitud suficiente (por ejemplo 8 o más caracteres)
    if (valor.length > 7) {
      setMensaje("Buscando producto...");

      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .eq("codigo_barras", valor)
        .single();

      if (error) {
        setMensaje("❌ No se encontró el producto en la base de datos.");
      } else {
        setMensaje(`✅ Producto encontrado: ${data.nombre} (${data.marca})`);
      }
    }
  };

  const limpiar = () => {
    setCodigo("");
    setMensaje("");
  };

  return (
    <IonPage>
      <HeaderApp icon={<FaBarcode size={28} className="text-blue-400" />} title="Registro con Pistola" />
      <IonContent>
        <div style={{ padding: "1rem" }}>
          <IonItem>
            <IonLabel position="stacked">Escanea un código de barras</IonLabel>
            <IonInput
              autofocus
              value={codigo}
              onIonChange={handleScan}
              placeholder="Apunta con la pistola aquí..."
            />
          </IonItem>

          <p style={{ marginTop: "1rem", textAlign: "center" }}>{mensaje}</p>

          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <IonButton onClick={limpiar} color="medium">
              Limpiar
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
