import { useEffect, useRef, useState } from "react";
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
    const [loading, setLoading] = useState<boolean>(false);
    const [editData, setEditData] = useState<Partial<Producto>>({});
    const [changed, setChanged] = useState<boolean>(false);
    const mountedRef = useRef(true);

    // campos editables
    const editableFields: (keyof Producto)[] = [
        "nombre",
        "marca",
        "modelo",
        "compatibilidad",
        "observaciones",
    ];

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false; // marcar desmontado
        };
    }, []);

    useEffect(() => {
        if (!id) return;

        let ignore = false;
        const fetchProducto = async () => {
            // limpiamos estado y mostramos loader una sola vez
            if (mountedRef.current && !ignore) {
                setProducto(null);
                setEditData({});
                setChanged(false);
                setLoading(true);
            }

            const { data, error } = await supabase
                .from("productos")
                .select("*, categoria:categorias(nombre)")
                .eq("id", id)
                .single();

            // si el componente ya fue desmontado, no hacemos setState
            if (!mountedRef.current || ignore) return;

            if (error) {
                console.error("Error al obtener producto:", error.message);
                setProducto(null);
            } else {
                setProducto(data as Producto);
            }
            setLoading(false);
        };

        fetchProducto();

        // cleanup en caso de remounts rápidos
        return () => {
            ignore = true;
        };
    }, [id]);

    const formatFecha = (fecha: string | null) =>
        fecha ? new Date(fecha).toLocaleString("es-CL") : "N/A";

    const handleEdit = (field: keyof Producto, value: string) => {
        setEditData((prev) => ({ ...prev, [field]: value }));
        setChanged(true);
    };

    const handleSave = async () => {
        if (!id || !changed) return;

        // sólo los campos que se cambiaron
        const payload: Record<string, any> = {};
        Object.keys(editData).forEach((k) => {
            payload[k] = (editData as any)[k];
        });

        const { error } = await supabase.from("productos").update(payload).eq("id", id);
        if (error) {
            console.error("Error al actualizar producto:", error.message);
            alert("Error al guardar cambios");
            return;
        }

        // refrescar localmente
        setProducto((prev) => (prev ? ({ ...prev, ...payload } as Producto) : prev));
        setEditData({});
        setChanged(false);
        alert("Cambios guardados ✅");
    };

    // Si está cargando, mostramos UN ÚNICO loader (early return)
    if (loading) {
        return (
            <div className="editor-container">
                <h2 className="titulo-centrado">
                    <FaBoxOpen /> Detalle del Producto
                </h2>
                <div className="loading-container">
                    <p>Cargando producto...</p>
                </div>
            </div>
        );
    }

    if (!producto) {
        return (
            <div className="editor-container">
                <h2 className="titulo-centrado">
                    <FaBoxOpen /> Detalle del Producto
                </h2>
                <p style={{ textAlign: "center", marginTop: 24 }}>No se encontró el producto</p>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                    <button className="btn-volver" onClick={() => history.replace("/productos")}>
                        ⬅ Volver
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-container">
            <h2 className="titulo-centrado">
                <FaBoxOpen /> Detalle del Producto
            </h2>

            <div className="editor-producto-card">
                <div className="editor-body">
                    <p><strong>ID:</strong> {String(producto.id)}</p>

                    <p>
                        <strong>Código de Barras:</strong>{" "}
                        {producto.codigo_barras ?? "N/A"}
                    </p>

                    <p>
                        <strong>Nombre:</strong>
                        <input
                            title={String(editData.nombre ?? producto.nombre ?? "")}
                            value={String(editData.nombre ?? producto.nombre ?? "")}
                            onChange={(e) => handleEdit("nombre", e.target.value)}
                        />
                    </p>

                    <p>
                        <strong>Marca:</strong>
                        <input
                            title={String(editData.marca ?? producto.marca ?? "")}
                            value={String(editData.marca ?? producto.marca ?? "")}
                            onChange={(e) => handleEdit("marca", e.target.value)}
                        />
                    </p>

                    <p>
                        <strong>Modelo:</strong>
                        <input
                            title={String(editData.modelo ?? producto.modelo ?? "")}
                            value={String(editData.modelo ?? producto.modelo ?? "")}
                            onChange={(e) => handleEdit("modelo", e.target.value)}
                        />
                    </p>

                    <p>
                        <strong>Compatibilidad:</strong>
                        <textarea
                            title={String(editData.compatibilidad ?? producto.compatibilidad ?? "")}
                            value={String(editData.compatibilidad ?? producto.compatibilidad ?? "")}
                            onChange={(e) => handleEdit("compatibilidad", e.target.value)}
                        />
                    </p>

                    <p><strong>SKU:</strong> {producto.sku ?? "N/A"}</p>

                    <p><strong>Categoría:</strong> {producto.categoria?.nombre ?? "Sin categoría"}</p>

                    <p><strong>Unidad:</strong> {producto.unidad ?? "N/A"}</p>

                    <p><strong>Stock mínimo:</strong> {producto.stock_minimo ?? "N/A"}</p>

                    <p>
                        <strong>Observaciones:</strong>
                        <textarea
                            title={String(editData.observaciones ?? producto.observaciones ?? "")}
                            value={String(editData.observaciones ?? producto.observaciones ?? "")}
                            onChange={(e) => handleEdit("observaciones", e.target.value)}
                        />
                    </p>

                    <p>
                        <strong>Activo:</strong>{" "}
                        {producto.activo ? <span className="activo">✔ Sí</span> : <span className="inactivo">✘ No</span>}
                    </p>

                    <p><strong>Creado en:</strong> {formatFecha(producto.creado_en)}</p>
                    <p><strong>Última actualización:</strong> {formatFecha(producto.updated_at)}</p>
                </div>

                <div className="editor-actions">
                    <button
                        className="btn-guardar"
                        onClick={handleSave}
                        disabled={!changed}
                        title={!changed ? "No hay cambios para guardar" : "Guardar cambios"}
                    >
                        💾 Guardar cambios
                    </button>

                    <button
                        className="btn-volver"
                        onClick={() => history.replace("/productos")}
                    >
                        ⬅ Volver
                    </button>
                </div>
            </div>
        </div>
    );
}
