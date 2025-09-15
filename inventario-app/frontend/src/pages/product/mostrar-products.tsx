import { useState } from "react";
import ProductosTable from "../../components/product/table-editor"; // 👈 tu tabla
import ProductosSearch from "../../components/home/productos-search"; // 👈 buscador (si quieres el mismo que en Home)
import { FaBoxOpen } from "react-icons/fa"; 
import "./mostrar-products.css"; 
export default function Productos() {
  const [productosFiltrados, setProductosFiltrados] = useState<any[] | null>(null);

  return (
    <div style={{ padding: "1rem" }}>
      <br />
      <h2 className="titulo-centrado">
        <FaBoxOpen /> Productos para editar
      </h2>
      <br />
      {/* Buscador opcional */}
      <ProductosSearch onResults={setProductosFiltrados} />
      <br />
      {/* Tabla de productos */}
      <ProductosTable productos={productosFiltrados ?? undefined} />
    </div>
  );
}
