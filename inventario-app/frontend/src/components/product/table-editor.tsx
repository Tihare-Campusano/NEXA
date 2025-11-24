import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { withRouter, RouteComponentProps } from "react-router-dom";
import "./table-editor.css";

// Configura tu cliente de Supabase
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export type Producto = {
    id: number;
    nombre: string;
};

type Props = {
    productos?: Producto[];
};

type ProductosTableProps = Props & RouteComponentProps;

function ProductosTable({ productos: productosProp, history }: ProductosTableProps) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);

    const modoBusqueda = !!productosProp;

    useEffect(() => {
        if (productosProp) {
            setProductos(productosProp);
            setLoading(false);
            return;
        }

        const fetchProductos = async () => {
            setLoading(true);

            const { data, error } = await supabase
                .from("productos")
                .select(`
                    id,
                    nombre
                `)
                .order("id", { ascending: false });

            if (error) {
                console.error("Error al cargar productos:", error.message);
            } else {
                const productosLimpios: Producto[] = data.map((p: any) => ({
                    id: p.id,
                    nombre: p.nombre,
                }));

                setProductos(productosLimpios);
                setTotal(data.length);
            }

            setLoading(false);
        };

        fetchProductos();
    }, [productosProp]);

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

            {/* Tabla */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productos.length > 0 ? (
                            productos.map((prod) => (
                                <tr key={prod.id}>
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
                                <td colSpan={2} style={{ textAlign: "center", padding: "10px" }}>
                                    No hay productos
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Paginación */}
                {!modoBusqueda && total > pageSize && (
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
