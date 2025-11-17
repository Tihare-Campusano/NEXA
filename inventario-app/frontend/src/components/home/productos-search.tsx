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

    // ---------- FORMATEO DE FECHA ----------
    const formatFecha = (iso: string | null | undefined) => {
        if (!iso) return "-";
        try {
            const d = new Date(iso);
            return (
                d.toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                }) +
                " " +
                d.toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );
        } catch {
            return "-";
        }
    };

    // ---------- FORMATEO DE DATOS ----------
    const mapProducto = (p: any) => ({
        id: p.id,
        nombre: p.nombre ?? "Sin nombre",
        stock: typeof p.stock === "number" ? p.stock : (p.stock?.cantidad ?? 0),
        estado: p.stock?.estado ?? p.estado ?? "N/A",
        disponibilidad: p.disponibilidad ?? "N/A",
        activo: !!p.activo,
        fecha: p.created_at ? formatFecha(p.created_at) : "-",
    });

    // ---------- CARGAR TODO ----------
    const fetchAll = useCallback(async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("productos")
            .select(`
                id,
                nombre,
                activo,
                created_at,
                disponibilidad,
                estado,
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
                activo,
                created_at,
                disponibilidad,
                estado,
                stock ( cantidad, estado )
            `)
            .or(
                `nombre.ilike.%${query}%,estado.ilike.%${query}%,disponibilidad.ilike.%${query}%`
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
                    placeholder="Buscar por nombre, estado, disponibilidad, código..."
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