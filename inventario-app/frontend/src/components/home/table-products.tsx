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
    productos?: Producto[] | null; // puede venir undefined | null | array
};

export default function ProductosTable({ productos: productosProp }: Props) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);

    const isMounted = useRef(true);
    const fetchInFlight = useRef(false);

    // 🔹 Formateador de fecha
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
            return fechaISO ?? "-";
        }
    }

    // Fetch desde Supabase
    const fetchProductos = useCallback(async () => {
        // Evitar llamadas concurrentes
        if (fetchInFlight.current) return;
        fetchInFlight.current = true;

        setLoading(true);
        try {
            console.debug("[ProductosTable] fetchProductos: llamando a supabase...");
            const { data, error } = await supabase
                .from("productos")
                .select(
                    `
            id,
            nombre,
            activo,
            stock,
            estado,
            disponibilidad,
            created_at
        `
                )
                .order("id", { ascending: false });

            if (error) {
                console.error("[ProductosTable] Error al cargar productos:", error.message);
                // No sobreescribir la lista actual si hay error (mejor dejar lo que haya)
            } else if (data && Array.isArray(data)) {
                const productosFormateados: Producto[] = data.map((p: any) => ({
                    id: p.id,
                    nombre: p.nombre ?? "Sin nombre",
                    activo: !!p.activo,
                    stock: (typeof p.stock === "number" ? p.stock : p.stock ?? 0) ?? 0,
                    estado: p.estado ?? "N/A",
                    disponibilidad: p.disponibilidad ?? "N/A",
                    fecha: p.created_at ? formatearFecha(p.created_at) : "-",
                }));

                if (isMounted.current) {
                    setProductos(productosFormateados);
                }
            } else {
                // data === null o inesperado
                console.warn("[ProductosTable] fetchProductos: data vacía o no es array", data);
                if (isMounted.current) setProductos([]);
            }
        } catch (e) {
            console.error("[ProductosTable] Excepción fetchProductos:", e);
        } finally {
            fetchInFlight.current = false;
            if (isMounted.current) setLoading(false);
        }
    }, []);

    // Manage lifecycle + props
    useEffect(() => {
        isMounted.current = true;

        // Si productosProp está definido (puede ser null o array)
        // - undefined  -> cargar desde supabase
        // - null       -> búsqueda realizada pero sin resultados -> mostrar vacío
        // - array      -> mostrar array
        if (productosProp !== undefined) {
            // Si vienen resultados (array) o null explícito (buscar sin resultados)
            console.debug("[ProductosTable] productosProp recibido:", productosProp);
            setProductos(productosProp ?? []); // null -> []
            setLoading(false);
        } else {
            // productosProp === undefined -> cargar datos desde supabase
            fetchProductos();
        }

        return () => {
            isMounted.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productosProp, fetchProductos]); // fetchProductos está memorizado con useCallback

    // Recargar cuando la ventana reciba foco (útil al volver desde otra página)
    useEffect(() => {
        function onFocus() {
            console.debug("[ProductosTable] window focus - revalidando datos");
            // Solo recargar si NO estamos mostrando resultados provenientes de búsqueda
            if (productosProp === undefined) {
                fetchProductos();
            } else {
                console.debug("[ProductosTable] productosProp definido, no re-cargar desde focus");
            }
        }

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [productosProp, fetchProductos]);

    // Mostrar mensaje de carga sólo al inicio (si no hay datos)
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
