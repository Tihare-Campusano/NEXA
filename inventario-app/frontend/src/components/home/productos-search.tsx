import { useState, useEffect, useCallback } from "react";
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

    // ---------- FORMATEO DE DATOS ----------
    const mapProducto = (p: any) => ({
        id: p.id,
        nombre: p.nombre,
        marca: p.marca,
        modelo: p.modelo,
        codigo_barras: p.codigo_barras ?? null,
        activo: p.activo,
        stock: p.stock?.cantidad ?? 0,
        estado: p.stock?.estado ?? "N/A",
        created_at: p.created_at,
    });

    // ---------- CARGAR TODO ----------
    const fetchAll = useCallback(async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("productos")
            .select(`
                id,
                nombre,
                marca,
                modelo,
                codigo_barras,
                activo,
                created_at,
                stock ( cantidad, estado )
            `)
            .order("id", { ascending: false });

        if (!error && data) {
            onResults(data.map(mapProducto));
        }
        setLoading(false);
    }, [onResults]);

    // ---------- BÚSQUEDA ----------
    const fetchSearch = useCallback(async () => {
        if (query.trim().length === 0) return fetchAll();

        setLoading(true);

        const { data, error } = await supabase
            .from("productos")
            .select(`
                id,
                nombre,
                marca,
                modelo,
                codigo_barras,
                activo,
                created_at,
                stock ( cantidad, estado )
            `)
            .or(
                `nombre.ilike.%${query}%,marca.ilike.%${query}%,modelo.ilike.%${query}%,codigo_barras.ilike.%${query}%`
            )
            .order("id", { ascending: false });

        if (!error && data) {
            onResults(data.map(mapProducto));
        }
        setLoading(false);
    }, [query, onResults, fetchAll]);

    // ---------- DEBOUNCE ----------
    useEffect(() => {
        const t = setTimeout(() => {
            query.trim().length === 0 ? fetchAll() : fetchSearch();
        }, 350);

        return () => clearTimeout(t);
    }, [query, fetchAll, fetchSearch]);

    // ---------- UI ----------
    return (
        <div className="search-bar-container">
            <div className="search-box">
                <span className="search-icon">🔎</span>

                <input
                    type="text"
                    placeholder="Buscar por nombre, código de barras..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="search-input"
                />

                {query && !loading && (
                    <button
                        className="clear-btn"
                        onClick={() => setQuery("")}
                    >
                        ❌
                    </button>
                )}

                {loading && <span className="loading-spinner"></span>}
            </div>
        </div>
    );
}
