import { useState } from "react";
import { IonPage, IonContent } from "@ionic/react";
import ProductosTable, { Producto } from "../../components/product/table-editor";
import ProductosSearch from "../../components/home/productos-search";
import { FaBoxOpen } from "react-icons/fa";
import HeaderApp from "../../components/header_app";
import "./mostrar-products.css";

export default function Productos() {
  const [productosFiltrados, setProductosFiltrados] = useState<Producto[] | null>(null);

  return (
    <IonPage>
      <HeaderApp
        icon={<FaBoxOpen size={28} className="text-green-400" />}
        title="Productos para editar"
      />

      <IonContent className="ion-padding">
        {/* Buscador */}
        <ProductosSearch onResults={(arr) => setProductosFiltrados(arr as Producto[])} />

        <br />

        {/* Tabla */}
        <ProductosTable productos={productosFiltrados || undefined} />
      </IonContent>
    </IonPage>
  );
}
