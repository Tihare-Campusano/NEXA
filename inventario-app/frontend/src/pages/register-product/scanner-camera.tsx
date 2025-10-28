import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonToast,
} from "@ionic/react";
import HeaderApp from "../../components/header_app";
import { FaClipboard } from "react-icons/fa";

// Importaciones combinadas de ambas versiones
import Botones from "../../components/register-product/botones";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";

export default function ScannerCamera() {
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    stock: "",
    fecha: "",
    disponibilidad: "",
    estado: "",
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleChange = (field: string, value?: string | null) =>
    setForm((f) => ({ ...f, [field]: value ?? "" }));

  // 🔹 Función principal de escaneo
  const scanBarcode = async () => {
    // Verifica que sea un dispositivo nativo
    if (!Capacitor.isNativePlatform()) {
      setToastMsg("El escáner solo funciona en Android o iOS.");
      return;
    }

    try {
      // Solicita permisos de cámara
      const perm = await BarcodeScanner.requestPermissions();
      if (perm.camera !== "granted") {
        setToastMsg("Debes permitir el acceso a la cámara.");
        return;
      }

      // Abre la cámara y espera el resultado
      const { barcodes } = await BarcodeScanner.scan();

      if (barcodes.length > 0) {
        const code = barcodes[0].rawValue;
        handleChange("codigo", code);
        setToastMsg(`Código detectado: ${code}`);
      } else {
        setToastMsg("No se detectó ningún código.");
      }
    } catch (error) {
      console.error("Error escaneando código:", error);
      setToastMsg("Error al escanear.");
    }
  };

  return (
    <IonPage>
      <HeaderApp
        icon={<FaClipboard size={28} className="text-green-500" />}
        title="Registro de productos"
      />

      <IonContent className="ion-padding bg-white">
        {/* 🔹 Botones superiores (usando el componente refactorizado) */}
        <Botones />

        <h2 className="text-center text-xl font-extrabold my-4">Escáner con cámara</h2>

        {/* 🔹 Botón para escanear */}
        <IonButton
          expand="block"
          color="primary"
          className="rounded-xl h-12 mb-4"
          onClick={scanBarcode}
        >
          Escanear código de barra
        </IonButton>

        {/* 🔹 Formulario completo */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <IonItem className="rounded-lg">
            <IonLabel position="floating">Código</IonLabel>
            <IonInput
              value={form.codigo}
              onIonChange={(e) => handleChange("codigo", e.detail.value)}
            />
          </IonItem>

          <IonItem className="rounded-lg">
            <IonLabel position="floating">Nombre</IonLabel>
            <IonInput
              value={form.nombre}
              onIonChange={(e) => handleChange("nombre", e.detail.value)}
            />
          </IonItem>

          <IonItem className="rounded-lg">
            <IonLabel position="floating">Stock</IonLabel>
            <IonInput
              type="number"
              value={form.stock}
              onIonChange={(e) => handleChange("stock", e.detail.value)}
            />
          </IonItem>

          <IonItem className="rounded-lg">
            <IonLabel position="floating">Fecha</IonLabel>
            <IonInput
              value={form.fecha}
              onIonChange={(e) => handleChange("fecha", e.detail.value)}
            />
          </IonItem>

          <IonItem className="rounded-lg">
            <IonLabel position="floating">Disponibilidad</IonLabel>
            <IonInput
              value={form.disponibilidad}
              onIonChange={(e) => handleChange("disponibilidad", e.detail.value)}
            />
          </IonItem>

          <IonItem className="rounded-lg">
            <IonLabel position="floating">Estado</IonLabel>
            <IonInput
              value={form.estado}
              onIonChange={(e) => handleChange("estado", e.detail.value)}
            />
          </IonItem>
        </div>

        <IonButton
          expand="block"
          color="success"
          className="rounded-xl font-bold h-12"
          onClick={() => console.log("Siguiente →", form)}
        >
          Siguiente
        </IonButton>

        <div className="h-20" />

        <IonToast
          isOpen={!!toastMsg}
          message={toastMsg ?? ""}
          duration={2000}
          onDidDismiss={() => setToastMsg(null)}
        />
      </IonContent>
    </IonPage>
  );
}