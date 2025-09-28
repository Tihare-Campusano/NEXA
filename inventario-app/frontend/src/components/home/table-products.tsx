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
    disponibilidad: string;
};

type Props = {
    productos?: Producto[];
};

export default function ProductosTable({ productos: productosProp }: Props) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Si vienen productos por props, úsalos y no los sobreescribas
        if (productosProp && productosProp.length > 0) {
            setProductos(productosProp);
            setLoading(false);
            return;
        }

        // Si ya tenemos productos cargados, no vuelvas a resetearlos
        if (productos.length > 0) return;

        const fetchProductos = async () => {
            setLoading(true);

            const { data, error } = await supabase
                .from("productos")
                .select(`
          id,
          nombre,
          activo,
          created_at,
          stock (
            cantidad,
            estado,
            disponibilidad,
            ultima_actualizacion
          )
        `)
                .order("id", { ascending: false });

            if (error) {
                console.error("Error al cargar productos:", error.message);
            } else {
                const productosConStock: Producto[] = data.map((p: any) => ({
                    id: p.id,
                    nombre: p.nombre,
                    activo: p.activo,
                    stock: p.stock?.cantidad ?? 0,
                    estado: p.stock?.estado ?? "N/A",
                    disponibilidad: p.stock?.disponibilidad ?? "Baja",
                    fecha: p.created_at ?? "-",
                }));
                setProductos(productosConStock);
            }

            setLoading(false);
        };

        fetchProductos();
    }, [productosProp]);

    // Solo mostrar "Cargando..." si no hay nada cargado aún
    if (loading && productos.length === 0) {
        return <p>Cargando productos...</p>;
    }

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
                            <th>Disponibilidad</th>
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
                                    <td>{p.estado}</td>
                                    <td>{p.disponibilidad}</td>
                                    <td className="check">{p.activo ? "✅" : "❌"}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} style={{ textAlign: "center", padding: "10px" }}>
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