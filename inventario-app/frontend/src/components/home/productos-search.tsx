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

  /* -------------------------------------------------------
    📌 FORMATEO DE FECHA
  ------------------------------------------------------- */
  const formatFecha = (iso?: string | null) => {
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

  /* -------------------------------------------------------
    📌 FORMATEO DE PRODUCTO
  ------------------------------------------------------- */
  const mapProducto = (p: any) => ({
    id: p.id,
    nombre: p.nombre ?? "Sin nombre",
    stock: p.stock ?? 0,
    estado: p.estado ?? "N/A",
    disponibilidad: p.disponibilidad ?? "N/A",
    activo: !!p.activo,
    fecha: p.created_at ? formatFecha(p.created_at) : "-",
  });

  /* -------------------------------------------------------
    📌 TRAER TODOS LOS PRODUCTOS
  ------------------------------------------------------- */
  const fetchAll = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("productos")
      .select(
        `
        id,
        nombre,
        activo,
        created_at,
        disponibilidad,
        estado,
        stock
      `
      )
      .order("id", { ascending: false });

    if (error) {
      console.error("Error al cargar productos:", error);
      onResults([]);
    } else if (data) {
      onResults(data.map(mapProducto));
    }

    setLoading(false);
  }, [onResults]);

  /* -------------------------------------------------------
    📌 BÚSQUEDA
  ------------------------------------------------------- */
  const fetchSearch = useCallback(async () => {
    const term = query.trim();
    if (!term) {
      return fetchAll(); // sin texto → recargar todo
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("productos")
      .select(
        `
        id,
        nombre,
        activo,
        created_at,
        disponibilidad,
        estado,
        stock
      `
      )
      .or(
        `nombre.ilike.%${term}%,estado.ilike.%${term}%,disponibilidad.ilike.%${term}%`
      )
      .order("id", { ascending: false });

    if (error) {
      console.error("Error al buscar productos:", error);
      onResults([]);
    } else if (data) {
      onResults(data.map(mapProducto));
    }

    setLoading(false);
  }, [query, fetchAll, onResults]);

  /* -------------------------------------------------------
    📌 EFECTO DE BÚSQUEDA CON DEBOUNCE
  ------------------------------------------------------- */
  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.trim() === "") {
        fetchAll();
      } else {
        fetchSearch();
      }
    }, 350);

    return () => clearTimeout(delay);
  }, [query, fetchAll, fetchSearch]);

  /* -------------------------------------------------------
    📌 UI
  ------------------------------------------------------- */
  return (
    <div className="search-bar-container">
      <div className="search-box">
        <span className="search-icon">🔎</span>

        <input
          type="text"
          placeholder="Buscar por nombre, estado, disponibilidad..."
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
    </div>
  );
}
