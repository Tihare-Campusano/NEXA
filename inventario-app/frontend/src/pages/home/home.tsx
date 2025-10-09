import { useState } from "react";
import ProductosTable from "../../components/home/table-products";
import ProductosSearch from "../../components/home/productos-search";
import { FaBoxes } from "react-icons/fa";
import { IonPage, IonContent } from "@ionic/react";
import HeaderApp from "../../components/header_app"; 

export default function Home() {
  const [productosFiltrados, setProductosFiltrados] = useState<any[] | null>(null);

  return (
    <IonPage>
      {/* 🔹 Header reutilizable */}
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