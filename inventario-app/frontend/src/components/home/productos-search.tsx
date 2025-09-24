import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./productos-search.css";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type Props = {
    onResults: (productos: any[]) => void;
};

export default function ProductosSearch({ onResults }: Props) {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);

    // 👉 Búsqueda automática con debounce
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (query.trim().length === 0) {
                fetchAllProductos(); // 🔹 en vez de limpiar, recargo todos
            } else {
                handleSearch();
            }
        }, 400);

        return () => clearTimeout(timeout);
    }, [query]);

    // 🔹 Buscar productos por similitud
    const handleSearch = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("productos")
            .select(`
        id,
        nombre,
        marca,
        modelo,
        sku,
        activo,
        created_at,
        stock ( cantidad, estado, ultima_actualizacion )
      `)
            .ilike("nombre", `%${query}%`); // similitud básica

        if (error) {
            console.error("Error en la búsqueda:", error.message);
        } else {
            const productosConStock = data.map((p: any) => ({
                id: p.id,
                nombre: p.nombre,
                marca: p.marca,
                modelo: p.modelo,
                sku: p.sku,
                activo: p.activo,
                stock: p.stock?.cantidad ?? 0,
                estado: p.stock?.estado ?? "N/A",
                fecha: p.created_at,
            }));
            onResults(productosConStock);
        }
        setLoading(false);
    };

    // 🔹 Traer todos los productos (cuando se borra la búsqueda)
    const fetchAllProductos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("productos")
            .select(`
        id,
        nombre,
        marca,
        modelo,
        sku,
        activo,
        created_at,
        stock ( cantidad, estado, ultima_actualizacion )
      `)
            .order("id", { ascending: false });

        if (error) {
            console.error("Error cargando productos:", error.message);
        } else {
            const productosConStock = data.map((p: any) => ({
                id: p.id,
                nombre: p.nombre,
                marca: p.marca,
                modelo: p.modelo,
                sku: p.sku,
                activo: p.activo,
                stock: p.stock?.cantidad ?? 0,
                estado: p.stock?.estado ?? "N/A",
                fecha: p.created_at,
            }));
            onResults(productosConStock);
        }
        setLoading(false);
    };

    return (
        <div className="search-box">
            <span className="search-icon">🔎</span>
            <input
                type="text"
                placeholder="Buscar producto..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
            />
            {query && !loading && (
                <button
                    className="clear-btn"
                    onClick={() => {
                        setQuery("");
                        fetchAllProductos(); // 🔹 al limpiar, refresca la tabla
                    }}
                >
                    ❌
                </button>
            )}
            {loading && <span className="loading-spinner"></span>}
        </div>
    );
}
