import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./table-products.css";

// Configura tu cliente de Supabase
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export type Producto = {
    id: number;
    nombre: string;
    stock: number;
    estado: string;
    activo: boolean;
    fecha: string;
};

type Props = {
    productos?: Producto[];
};

export default function ProductosTable({ productos: productosProp }: Props) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);

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
            nombre,
            activo,
            stock (
                cantidad,
                estado,
                ultima_actualizacion
                )
            `)
                .order("id", { ascending: false });

            if (error) {
                console.error("Error al cargar productos:", error.message);
            } else {
                const productosConStock = data.map((p: any) => ({
                    id: p.id,
                    nombre: p.nombre,
                    activo: p.activo,
                    stock: p.stock?.cantidad ?? 0,
                    estado: p.stock?.estado ?? "N/A",
                    fecha: p.stock?.ultima_actualizacion ?? "-",
                }));
                setProductos(productosConStock);
            }
            setLoading(false);
        };

        fetchProductos();
    }, [productosProp]);

    if (loading) return <p>Cargando productos...</p>;

    return (
        <div className="productos-card-outer">
            {/* Card interna solo para el encabezado */}
            <div className="productos-card">
                <div className="productos-header">
                    <span className="productos-icon">📦</span>
                    <h3 className="productos-title">Lista de Productos</h3>
                </div>
            </div>

            {/* Tabla afuera de la card interna */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Stock</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Activo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productos.length > 0 ? (
                            productos.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.id}</td>
                                    <td>{p.nombre}</td>
                                    <td>{p.stock}</td>
                                    <td>{p.fecha}</td>
                                    <td>
                                        <span
                                            className={`badge ${p.estado === "Disponible"
                                                ? "disponible"
                                                : p.estado === "Agotado"
                                                    ? "agotado"
                                                    : "na"
                                                }`}
                                        >
                                            {p.estado}
                                        </span>
                                    </td>
                                    <td className="check">{p.activo ? "✅" : "❌"}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} style={{ textAlign: "center", padding: "10px" }}>
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
