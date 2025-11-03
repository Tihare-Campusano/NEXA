import { useState, useEffect } from "react";
import ProductosTable from "../../components/home/table-products";
import ProductosSearch from "../../components/home/productos-search";
import { FaBoxes } from "react-icons/fa";
import { IonPage, IonContent } from "@ionic/react";
import HeaderApp from "../../components/header_app"; 
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Filesystem } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core"; // ✅ Solo esto

export default function Home() {
  const [productosFiltrados, setProductosFiltrados] = useState<any[] | null>(null);

  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // Permiso de cámara
        await Camera.requestPermissions();

        // Permiso de almacenamiento solo en Android
        if (Capacitor.getPlatform() === "android") {
          await Filesystem.requestPermissions();
        }

        console.log("✅ Permisos concedidos");
      } catch (error) {
        console.error("❌ Error solicitando permisos:", error);
      }
    };

    requestPermissions();
  }, []);

  return (
    <IonPage>
      <HeaderApp icon={<FaBoxes size={28} className="text-green-400" />} title="Gestor de inventarios" />
      <IonContent>
        <div style={{ padding: "1rem" }}>
          <ProductosSearch onResults={setProductosFiltrados} />
          <br />
          <ProductosTable productos={productosFiltrados ?? undefined} />
        </div>
      </IonContent>
    </IonPage>
  );
}
