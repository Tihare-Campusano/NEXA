import { useState } from "react";
import ProductosTable from "../../components/home/table-products";
import ProductosSearch from "../../components/home/productos-search";

export default function Home() {
  const [productosFiltrados, setProductosFiltrados] = useState<any[] | null>(null);

  return (
    <div style={{ padding: "1rem" }}>
      <h1>🏠 Home</h1>
      <ProductosSearch onResults={setProductosFiltrados} />
      <br />
      <ProductosTable productos={productosFiltrados ?? undefined} />
    </div>
  );
}