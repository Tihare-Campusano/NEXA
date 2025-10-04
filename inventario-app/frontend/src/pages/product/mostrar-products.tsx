import { useState } from "react";
import { IonPage, IonContent } from "@ionic/react";
import ProductosTable from "../../components/product/table-editor";
import ProductosSearch from "../../components/home/productos-search";
import { FaBoxOpen } from "react-icons/fa";
import "./mostrar-products.css";

export default function Productos() {
  const [productosFiltrados, setProductosFiltrados] = useState<any[] | null>(null);

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <h2 className="titulo-centrado">
          <FaBoxOpen /> Productos para editar
        </h2>

        {/* Buscador opcional */}
        <ProductosSearch onResults={setProductosFiltrados} />
        <br />

        {/* Tabla de productos */}
        <ProductosTable productos={productosFiltrados ?? undefined} />
      </IonContent>
    </IonPage>
  );
}