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
    const [editData, setEditData] = useState<Partial<Producto>>({});
    const [changed, setChanged] = useState(false);

    // Campos editables
    const editableFields: (keyof Producto)[] = [
        "nombre",
        "marca",
        "modelo",
        "compatibilidad",
        "observaciones",
    ];

    useEffect(() => {
        const fetchProducto = async () => {
            setProducto(null); // limpiar estado previo
            setEditData({});
            setChanged(false);
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

    const handleEdit = (field: keyof Producto, value: string) => {
        setEditData((prev) => ({
            ...prev,
            [field]: value,
        }));
        setChanged(true);
    };

    const handleSave = async () => {
        if (!id || !changed) return;

        const { error } = await supabase
            .from("productos")
            .update(editData)
            .eq("id", id);

        if (error) {
            console.error("Error al actualizar producto:", error.message);
            return;
        }

        // refrescar datos después de guardar
        setProducto((prev) =>
            prev ? { ...prev, ...editData } : prev
        );
        setEditData({});
        setChanged(false);
        alert("Cambios guardados con éxito ✅");
    };

    return (
        <div className="editor-container">
            <h2 className="titulo-centrado">
                <FaBoxOpen /> Detalle del Producto
            </h2>

            <div className="editor-producto-card">
                <div className="editor-body">
                    {Object.entries(producto).map(([key, value]) => {
                        if (key === "categoria") {
                            return (
                                <p key={key}>
                                    <strong>Categoría:</strong>{" "}
                                    {producto.categoria?.nombre || "Sin categoría"}
                                </p>
                            );
                        }

                        // solo mostrar campos que nos interesan
                        if ([
                            "id", "codigo_barras", "sku", "categoria_id", "unidad",
                            "stock_minimo", "activo", "creado_en", "created_at", "updated_at"
                        ].includes(key)) {
                            if (key === "activo") {
                                return (
                                    <p key={key}>
                                        <strong>Activo:</strong>{" "}
                                        {producto.activo ? (
                                            <span className="activo">✔ Sí</span>
                                        ) : (
                                            <span className="inactivo">✘ No</span>
                                        )}
                                    </p>
                                );
                            }

                            if (key === "creado_en" || key === "updated_at") {
                                return (
                                    <p key={key}>
                                        <strong>
                                            {key === "creado_en"
                                                ? "Creado en"
                                                : "Última actualización"}
                                            :
                                        </strong>{" "}
                                        {formatFecha(value as string | null)}
                                    </p>
                                );
                            }

                            return (
                                <p key={key}>
                                    <strong>{key.replace("_", " ")}:</strong>{" "}
                                    {typeof value === "boolean"
                                        ? value
                                            ? "Sí"
                                            : "No"
                                        : value !== null && value !== undefined
                                            ? String(value)
                                            : "N/A"}
                                </p>
                            );
                        }

                        // campos editables
                        if (editableFields.includes(key as keyof Producto)) {
                            return (
                                <p key={key}>
                                    <strong>{key}:</strong>{" "}
                                    <input
                                        type="text"
                                        value={
                                            String(
                                                editData[key as keyof Producto] ??
                                                (value as string | number | boolean | null) ??
                                                ""
                                            )
                                        }
                                        onChange={(e) =>
                                            handleEdit(key as keyof Producto, e.target.value)
                                        }
                                    />
                                </p>
                            );
                        }

                        return null;
                    })}
                </div>

                <div className="editor-actions">
                    {changed && (
                        <button className="btn-guardar" onClick={handleSave}>
                            💾 Guardar cambios
                        </button>
                    )}
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
