import { useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import "./editor-producto.css";

// Configura el cliente de Supabase
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export type Producto = {
    id: number;
    codigo_barras: string | null;
    nombre: string;
    descripcion?: string | null;
    precio?: number | null;
    stock?: number | null;
    categoria?: string | null;
    fecha_creacion?: string | null;
};

export default function EditorProducto() {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();

    const [producto, setProducto] = useState<Producto | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducto = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("productos")
                .select("*") // traemos todos los campos
                .eq("id", id)
                .single(); // porque solo debe traer uno

            if (error) {
                console.error("Error al obtener producto:", error.message);
            } else {
                setProducto(data);
            }
            setLoading(false);
        };

        if (id) {
            fetchProducto();
        }
    }, [id]);

    if (loading) return <p>Cargando producto...</p>;
    if (!producto) return <p>No se encontró el producto</p>;

    return (
        <div className="editor-producto-card">
            <div className="editor-header">
                <span className="editor-icon">📝</span>
                <h2>Detalle del Producto</h2>
            </div>

            <div className="editor-body">
                <p><strong>ID:</strong> {producto.id}</p>
                <p><strong>Código de Barras:</strong> {producto.codigo_barras || "N/A"}</p>
                <p><strong>Nombre:</strong> {producto.nombre}</p>
                <p><strong>Descripción:</strong> {producto.descripcion || "Sin descripción"}</p>
                <p><strong>Precio:</strong> {producto.precio != null ? `$${producto.precio}` : "N/A"}</p>
                <p><strong>Stock:</strong> {producto.stock != null ? producto.stock : "N/A"}</p>
                <p><strong>Categoría:</strong> {producto.categoria || "Sin categoría"}</p>
                <p><strong>Fecha de creación:</strong> {producto.fecha_creacion || "N/A"}</p>
            </div>

            <div className="editor-actions">
                <button className="btn-volver" onClick={() => history.push("/")}>
                    ⬅ Volver
                </button>
            </div>
        </div>
    );
}
