import { useState } from "react";
import { IonPage, IonContent } from "@ionic/react";
import ProductosTable from "../../components/product/table-editor";
import ProductosSearch from "../../components/home/productos-search";
import { FaBoxOpen } from "react-icons/fa";
import HeaderApp from "../../components/header_app";
import "./mostrar-products.css";

export default function Productos() {
  const [productosFiltrados, setProductosFiltrados] = useState<any[] | null>(null);

  return (
    <IonPage>
      {/* 🔹 Header reutilizable */}
      <HeaderApp icon={<FaBoxOpen size={28} className="text-green-400" />} title="Productos para editar" />
      <IonContent className="ion-padding"> 
        {/* Buscador opcional */}
        <ProductosSearch onResults={setProductosFiltrados} />
        <br />

        {/* Tabla de productos */}
        <ProductosTable productos={productosFiltrados ?? undefined} />
      </IonContent>
    </IonPage>
  );
}