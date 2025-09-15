import { useState } from "react";
import ProductosTable from "../../components/home/table-products";
import ProductosSearch from "../../components/home/productos-search";
import { FaBoxes } from "react-icons/fa";
import "./Home.css"; // 👈 importa tu CSS

export default function Home() {
  const [productosFiltrados, setProductosFiltrados] = useState<any[] | null>(null);

  return (
    <div style={{ padding: "1rem" }}>
      <br />
      <h2 className="titulo-centrado">
        <FaBoxes /> Gestor de inventarios
      </h2>
      <br />
      <ProductosSearch onResults={setProductosFiltrados} />
      <br />
      <ProductosTable productos={productosFiltrados ?? undefined} />
    </div>
  );
}