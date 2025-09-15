import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./productos-search.css"; // 👈 estilos separados

// 👇 Configura tu cliente de Supabase
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
                onResults([]); // limpia resultados si no hay búsqueda
                return;
            }
            handleSearch();
        }, 400);

        return () => clearTimeout(timeout);
    }, [query]);

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
            .ilike("nombre", `%${query}%`);

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
                <button className="clear-btn" onClick={() => setQuery("")}>
                    ❌
                </button>
            )}
            {loading && <span className="loading-spinner"></span>}
        </div>
    );
}