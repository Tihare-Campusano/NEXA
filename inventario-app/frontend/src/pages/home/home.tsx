import { useState, useEffect } from "react";
import ProductosTable from "../../components/home/table-products";
import ProductosSearch from "../../components/home/productos-search";
import { FaBoxes } from "react-icons/fa";
import { IonPage, IonContent } from "@ionic/react";
import HeaderApp from "../../components/header_app"; 
import ResumenDisponibilidad from "../../components/home/ResumenDisponibilidad";
import "./home.css";

export default function Home() {
  const [productosFiltrados, setProductosFiltrados] = useState<any[] | undefined>(undefined);

  return (
    <IonPage>
      <div className="flex justify-center items-center">
        <HeaderApp
          icon={<FaBoxes size={28} className="text-green-400" />}
          title="Gestor de inventarios"
        />
      </div>

      <IonContent>
        <div style={{ padding: "1rem" }}>
          <ProductosSearch onResults={setProductosFiltrados} />
          <br />
          <ProductosTable productos={productosFiltrados === null ? undefined : productosFiltrados} />
          <br />
          <ResumenDisponibilidad />
          <br />
        </div>
      </IonContent>
    </IonPage>

  );
}
