import { useEffect, useState, useRef, useCallback } from "react";
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
    productos?: Producto[] | null;
};

export default function ProductosTable({ productos: productosProp }: Props) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);

    const isMounted = useRef(true);
    const fetchInFlight = useRef(false);

    // 🔹 Formatear fecha
    function formatearFecha(fechaISO: string) {
        try {
            const date = new Date(fechaISO);
            return (
                date.toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                }) +
                " " +
                date.toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );
        } catch {
            return "-";
        }
    }

    // 🔹 FETCH desde Supabase
    const fetchProductos = useCallback(async () => {
        if (fetchInFlight.current) return;
        fetchInFlight.current = true;

        setLoading(true);

        try {
            const { data, error } = await supabase
                .from("productos")
                .select(`
                    id,
                    nombre,
                    activo,
                    stock,
                    estado,
                    disponibilidad,
                    created_at
                `)
                .order("id", { ascending: false });

            if (error) console.error("Error al cargar productos:", error);

            if (data && Array.isArray(data)) {
                const productosFormateados: Producto[] = data.map((p: any) => ({
                    id: p.id,
                    nombre: p.nombre ?? "Sin nombre",
                    activo: !!p.activo,
                    stock: typeof p.stock === "number" ? p.stock : 0,
                    estado: p.estado ?? "N/A",
                    disponibilidad: p.disponibilidad ?? "N/A",
                    fecha: p.created_at ? formatearFecha(p.created_at) : "-",
                }));

                if (isMounted.current) setProductos(productosFormateados);
            }
        } catch (e) {
            console.error("Excepción fetchProductos:", e);
        } finally {
            fetchInFlight.current = false;
            if (isMounted.current) setLoading(false);
        }
    }, []);

    // 🔹 Manejo de props + recarga automática
    useEffect(() => {
        isMounted.current = true;

        if (Array.isArray(productosProp)) {
            // Normalizamos cada item para que tenga las propiedades que la tabla usa
            const productosNormalizados: Producto[] = productosProp.map((p: any) => ({
                id: Number(p.id ?? 0),
                nombre: p.nombre ?? "Sin nombre",
                activo: !!p.activo,
                stock: typeof p.stock === "number" ? p.stock : (p.stock ?? 0),
                estado: p.estado ?? (p.stock?.estado ?? "N/A"),
                disponibilidad: p.disponibilidad ?? "N/A",
                fecha: p.fecha ?? (p.created_at ? formatearFecha(p.created_at) : "-"),
            }));

            if (isMounted.current) {
                setProductos(productosNormalizados);
                setLoading(false);
            }
        } else {
            fetchProductos();
        }

        return () => {
            isMounted.current = false;
        };
    }, [productosProp, fetchProductos]);

    // 🔹 Revalidar al volver a la pestaña
    useEffect(() => {
        function handleFocus() {
            fetchProductos();
        }

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchProductos]);

    if (loading && productos.length === 0) {
        return <p>Cargando productos...</p>;
    }

    return (
        <div className="productos-card-outer">
            <div className="productos-card">
                <div className="productos-header">
                    <span className="productos-icon">📦</span>
                    <h3 className="productos-title">Lista de Productos</h3>
                </div>
            </div>

            {/* TABLA EXTENDIDA (más abajo y más alta) */}
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
