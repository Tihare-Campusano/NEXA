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
    /**
     * Opcional: Se usa cuando los datos vienen de la barra de búsqueda (componente padre).
     * Si es 'null' o 'undefined', la tabla carga sus propios datos.
     */
    productos?: Producto[] | null;
};

export default function ProductosTable({ productos: productosProp }: Props) {
    // Estado para la data de carga inicial (solo se usa si productosProp es null/undefined)
    const [productos, setProductos] = useState<Producto[]>([]);
    
    // El estado de carga inicial ahora depende de si se recibió data por prop.
    const [loading, setLoading] = useState(
        productosProp === undefined || productosProp === null
    );

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

    // 🔹 FETCH desde Supabase (Usado para la carga inicial o revalidación sin búsqueda activa)
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

    // 🔹 Lógica de Manejo de props o Carga Inicial
    useEffect(() => {
        isMounted.current = true;

        if (Array.isArray(productosProp)) {
            // Caso 1: Hay resultados de la búsqueda (la data ya viene mapeada desde ProductosSearch)
            setProductos(productosProp);
            setLoading(false);
        } else {
            // Caso 2: productosProp es undefined (carga inicial) o null (búsqueda vacía).
            // Si es null, fetchProductos recarga todo, lo cual es el comportamiento deseado al limpiar la búsqueda.
            fetchProductos();
        }

        return () => {
            isMounted.current = false;
        };
    }, [productosProp, fetchProductos]);


    // 🔹 Revalidar al volver a la pestaña (solo si no hay búsqueda activa)
    useEffect(() => {
        function handleFocus() {
            // Si no estamos mostrando resultados de búsqueda (productosProp es null o undefined), revalidamos.
            if (productosProp === undefined || productosProp === null) {
                fetchProductos();
            }
        }

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchProductos, productosProp]);


    // Determina qué conjunto de datos renderizar: la prop (búsqueda) o el estado interno (carga inicial)
    const dataToRender = productosProp && Array.isArray(productosProp) ? productosProp : productos;

    if (loading && dataToRender.length === 0) {
        return <p className="loading-message">Cargando productos...</p>;
    }

    return (
        <div className="productos-card-outer">
            <div className="productos-card">
                <div className="productos-header">
                    <span className="productos-icon">📦</span>
                    <h3 className="productos-title">Lista de Productos</h3>
                </div>
            </div>

            {/* TABLA EXTENDIDA */}
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
                        {dataToRender.length > 0 ? (
                            dataToRender.map((p) => (
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
                                    {/* Mensaje dinámico según si se está buscando o no */}
                                    {productosProp !== undefined && productosProp !== null
                                        ? "No hay productos que coincidan con la búsqueda."
                                        : "No hay productos."
                                    }
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}