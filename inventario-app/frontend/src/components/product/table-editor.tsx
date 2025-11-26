import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { withRouter, RouteComponentProps } from "react-router-dom";
import "./table-editor.css";

// Configura Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export type Producto = {
  id: number;
  nombre: string;
};

interface Props extends RouteComponentProps {
  productos?: Producto[] | undefined; // ← resultados de búsqueda
}

function ProductosTable({ history, productos }: Props) {
  const [data, setData] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // PAGINACIÓN solo cuando NO hay búsqueda
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [total, setTotal] = useState(0);

  /* ============================================================
     🔥 FETCH desde Supabase SOLO si no viene búsqueda
  ============================================================ */
  const fetchProductos = async () => {
    if (productos) return; // si hay búsqueda → NO fetch

    setLoading(true);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("productos")
      .select(
        `
        id,
        nombre
      `,
        { count: "exact" }
      )
      .order("id", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error al cargar productos:", error.message);
      setData([]);
      setTotal(0);
    } else {
      const parsed =
        data?.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
        })) ?? [];

      setData(parsed);
      setTotal(count ?? parsed.length);
    }

    setLoading(false);
  };

  /* ============================================================
     🧠 USE EFFECT
  ============================================================ */
  useEffect(() => {
    if (productos && Array.isArray(productos)) {
      setData(productos);
      setLoading(false);
    } else {
      fetchProductos();
    }
  }, [productos, page]);

  if (loading) return <p>Cargando productos...</p>;

  return (
    <div className="productos-card-outer">
      <div className="productos-card">
        <div className="productos-header">
          <span className="productos-icon">📦</span>
          <h3 className="productos-title">Productos Registrados</h3>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {data.length > 0 ? (
              data.map((prod) => (
                <tr key={prod.id}>
                  <td>{prod.id}</td>

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
                <td colSpan={3} style={{ textAlign: "center" }}>
                  No hay productos
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* PAGINACIÓN solo si NO hay búsqueda */}
        {!productos && total > pageSize && (
          <div className="pagination">
            <button
              className="btn-ver"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>

            <span>
              Página {page} de {Math.ceil(total / pageSize)}
            </span>

            <button
              className="btn-ver"
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default withRouter(ProductosTable);
