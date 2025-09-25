import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useHistory } from "react-router-dom";
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

type Props = {
    productos?: Producto[];
};

export default function ProductosTable({ productos: productosProp }: Props) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const history = useHistory();

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
                .select("id, codigo_barras, nombre")
                .order("id", { ascending: false });

            if (error) {
                console.error("Error al cargar productos:", error.message);
            } else {
                setProductos(data || []);
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
                                    <td>{prod.codigo_barras || "N/A"}</td>
                                    <td>{prod.nombre}</td>
                                    <td>
                                        <button
                                            className="btn-ver"
                                            onClick={() => history.push(`/product/${prod.id}`)}
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
            </div>
        </div>
    );
}
