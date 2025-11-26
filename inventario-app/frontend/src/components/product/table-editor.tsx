import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { withRouter, RouteComponentProps } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { copyOutline } from "ionicons/icons";
import "./table-editor.css";

// Configura tu cliente de Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export type Producto = {
  id: number;
  codigo_barras: string | null;
  nombre: string;
};

type ProductosTableProps = RouteComponentProps;

function ProductosTable({ history }: ProductosTableProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from("productos")
        .select(
          `
          id,
          nombre,
          codigo_barras
        `,
          { count: "exact" }
        )
        .order("id", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("Error al cargar productos:", error.message);
        setProductos([]);
        setTotal(0);
      } else {
        const productosSimplificados: Producto[] =
          (data || []).map((p: any) => ({
            id: p.id,
            nombre: p.nombre,
            // si viene null de la BD, lo dejamos null
            codigo_barras: p.codigo_barras ?? null,
          })) ?? [];

        setProductos(productosSimplificados);
        setTotal(count ?? productosSimplificados.length);
      }

      setLoading(false);
    };

    fetchProductos();
  }, [page, pageSize]);

  if (loading) return <p>Cargando productos...</p>;

  return (
    <div className="productos-card-outer">
      {/* Card interna solo para encabezado */}
      <div className="productos-card">
        <div className="productos-header">
          <span className="productos-icon">📦</span>
          <h3 className="productos-title">Productos Registrados</h3>
        </div>
      </div>

      {/* Tabla con estilos mejorados */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Código de Barras</th>
              <th>Nombre</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {productos.length > 0 ? (
              productos.map((prod) => (
                <tr key={prod.id}>
                  <td>
                    {/* mostramos "-" solo si es null/undefined */}
                    {prod.codigo_barras ?? "-"}
                    {prod.codigo_barras && (
                      <>
                        <IonIcon
                          icon={copyOutline}
                          onClick={() => {
                            navigator.clipboard.writeText(
                              prod.codigo_barras as string
                            );
                            setCopiedId(prod.id);
                            setTimeout(() => {
                              setCopiedId((prev) =>
                                prev === prod.id ? null : prev
                              );
                            }, 2000);
                          }}
                          title="Copiar código"
                          style={{
                            marginLeft: 8,
                            cursor: "pointer",
                            fontSize: 18,
                            color: "#555",
                          }}
                        />
                        {copiedId === prod.id && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 12,
                              color: "#10b981",
                            }}
                          >
                            ¡Copiado!
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td>{prod.nombre}</td>
                  <td>
                    <button
                      className="btn-ver"
                      onClick={() => history.push(`/tabs/product/${prod.id}`)}
                    >
                      Ver producto
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: "10px" }}>
                  No hay productos
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginación simple */}
        {total > pageSize && (
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <button
              className="btn-ver"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </button>
            <span>
              Página {page} de {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <button
              className="btn-ver"
              onClick={() =>
                setPage((p) =>
                  p < Math.ceil(total / pageSize) ? p + 1 : p
                )
              }
              disabled={page >= Math.ceil(total / pageSize)}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ProductosTableWithRouter = withRouter(ProductosTable);
export default ProductosTableWithRouter;
