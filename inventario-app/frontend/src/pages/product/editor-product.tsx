import { useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { FaBoxOpen } from "react-icons/fa";
import "./editor-product.css";

// Configuración de Supabase
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export type Producto = {
    id: number;
    codigo_barras: string | null;
    marca: string | null;
    modelo: string | null;
    compatibilidad: string | null;
    sku: string | null;
    nombre: string;
    categoria_id: number | null;
    unidad: string | null;
    stock_minimo: number | null;
    observaciones: string | null;
    activo: boolean;
    creado_en: string | null;
    created_at: string | null;
    updated_at: string | null;
    categoria?: { nombre: string | null };
};

export default function EditorProducto() {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();

    const [producto, setProducto] = useState<Producto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducto = async () => {
            setProducto(null);
            setLoading(true);

            const { data, error } = await supabase
                .from("productos")
                .select(
                    `
          *,
          categoria:categorias(nombre)
        `
                )
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error al obtener producto:", error.message);
            } else {
                setProducto(data as Producto);
            }

            setLoading(false);
        };

        if (id) fetchProducto();
    }, [id]);

    if (loading) return <p>Cargando producto...</p>;
    if (!producto) return <p>No se encontró el producto</p>;

    // función para formatear fechas
    const formatFecha = (fecha: string | null) => {
        if (!fecha) return "N/A";
        return new Date(fecha).toLocaleString("es-CL");
    };

    return (
        <div className="editor-container">
            <h2 className="titulo-centrado">
                <FaBoxOpen /> Detalle del Producto
            </h2>

            <div className="editor-producto-card">
                <div className="editor-body">
                    <p><strong>ID:</strong> {producto.id}</p>
                    <p><strong>Código de Barras:</strong> {producto.codigo_barras || "N/A"}</p>
                    <p><strong>Nombre:</strong> {producto.nombre}</p>
                    <p><strong>Marca:</strong> {producto.marca || "N/A"}</p>
                    <p><strong>Modelo:</strong> {producto.modelo || "N/A"}</p>
                    <p><strong>Compatibilidad:</strong> {producto.compatibilidad || "N/A"}</p>
                    <p><strong>SKU:</strong> {producto.sku || "N/A"}</p>
                    <p><strong>Categoría:</strong> {producto.categoria?.nombre || "Sin categoría"}</p>
                    <p><strong>Unidad:</strong> {producto.unidad || "N/A"}</p>
                    <p><strong>Stock mínimo:</strong> {producto.stock_minimo ?? "N/A"}</p>
                    <p><strong>Observaciones:</strong> {producto.observaciones || "Ninguna"}</p>
                    <p>
                        <strong>Activo:</strong>{" "}
                        {producto.activo ? (
                            <span className="activo">✔ Sí</span>
                        ) : (
                            <span className="inactivo">✘ No</span>
                        )}
                    </p>
                    <p><strong>Creado en:</strong> {formatFecha(producto.creado_en)}</p>
                    <p><strong>Última actualización:</strong> {formatFecha(producto.updated_at)}</p>
                </div>

                <div className="editor-actions">
                    <button
                        className="btn-volver"
                        onClick={() => history.push("/productos")}
                    >
                        ⬅ Volver
                    </button>
                </div>
            </div>
        </div>
    );
}