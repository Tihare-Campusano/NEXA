import { useEffect, useRef, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { FaBoxOpen, FaEdit } from "react-icons/fa";
import "./editor-product.css";
import { IonPage, IonContent, IonIcon } from "@ionic/react";
import { arrowBackOutline, copyOutline, closeOutline } from "ionicons/icons";
import HeaderApp from "../../components/header_app";

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
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [removeQty, setRemoveQty] = useState<string>("");
    const [copied, setCopied] = useState(false);

    // editableFields eliminado: no se utiliza en la UI actual

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!id) return;

        let ignore = false;
        const fetchProducto = async () => {
            if (mountedRef.current && !ignore) {
                setProducto(null);
                setEditData({});
                setChanged(false);
                setLoading(true);
            }

            const { data, error } = await supabase
                .from("productos")
                .select("*, categoria:categorias(nombre)")
                .eq("id", Number(id))
                .single();

            if (!mountedRef.current || ignore) return;

            if (error) {
                console.error("Error al obtener producto:", error.message);
                setProducto(null);
            } else {
                // Normalizamos el código de barras al cargar
                const d = data as Producto;
                const codigo_barras = (d as any).codigo_barras ?? (d as any).sku ?? null;
                setProducto({ ...(d as any), codigo_barras } as Producto);
            }
            setLoading(false);
        };

        fetchProducto();

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

        setProducto((prev) => (prev ? ({ ...prev, ...payload } as Producto) : prev));
        setEditData({});
        setChanged(false);
        alert("Cambios guardados ✅");
    };

    const handleRemoveStock = async () => {
        if (!producto) return;
        const qty = Math.max(0, Math.floor(Number(removeQty || 0)));
        if (qty <= 0) {
            alert("Ingresa una cantidad válida");
            return;
        }
        // Obtener stock actual
        const { data: stockData, error: stockErr } = await supabase
            .from("stock")
            .select("cantidad")
            .eq("producto_id", producto.id)
            .single();
        if (stockErr) {
            alert("No se pudo obtener el stock actual");
            return;
        }

        const actual = Number(stockData?.cantidad ?? 0);
        if (actual <= 0) {
            alert("Ya no hay más stock disponible");
            return;
        }
        if (qty > actual) {
            alert("No es posible eliminar esa cantidad; supera el stock disponible");
            return;
        }

        const nuevo = Math.max(0, actual - qty);
        const { error: updErr } = await supabase
            .from("stock")
            .update({ cantidad: nuevo })
            .eq("producto_id", producto.id);
        if (updErr) {
            alert("Error al actualizar el stock");
            return;
        }

        setShowRemoveModal(false);
        setRemoveQty("");
        alert("Stock actualizado ✅");
    };

    // Loader
    if (loading) {
        return (
            <IonPage>
                <HeaderApp icon={<FaBoxOpen />} title="Detalle del Producto" />
                <IonContent className="ion-padding">
                    <div className="loading-container">
                        <p>Cargando producto...</p>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    // Producto no encontrado
    if (!producto) {
        return (
            <IonPage>
                <HeaderApp icon={<FaBoxOpen />} title="Detalle del Producto" />
                <IonContent className="ion-padding">
                    <p style={{ textAlign: "center", marginTop: 24 }}>No se encontró el producto</p>
                    <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
                        <button className="btn-volver" onClick={() => history.replace("/productos")}>
                            ⬅ Volver
                        </button>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage>
            <HeaderApp icon={<FaEdit size={28} className="text-green-400" />} title="Editar producto" />

            <IonContent fullscreen className="ion-padding">
                <div className="editor-container">
                    <div className="editor-producto-card">
                        {/* Flecha volver en la parte superior de la card */}
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
                            <IonIcon
                                icon={arrowBackOutline}
                                onClick={() => history.goBack()}
                                title="Volver"
                                style={{ cursor: 'pointer', fontSize: 22, color: '#333333' }}
                            />
                        </div>
                        <div className="editor-body">
                            <p><strong>ID:</strong> {String(producto.id)}</p>
                            <div style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <strong>Código de Barras</strong>
                                    <span style={{
                                        fontFamily: 'monospace',
                                        background: '#f3f4f6',
                                        padding: '2px 6px',
                                        borderRadius: 6,
                                        color: '#111827'
                                    }}>
                                        {String(editData.codigo_barras ?? producto.codigo_barras ?? producto.sku ?? 'N/A')}
                                    </span>
                                    {(producto.codigo_barras || producto.sku) && (
                                        <IonIcon
                                            icon={copyOutline}
                                            onClick={() => {
                                                navigator.clipboard.writeText(String(editData.codigo_barras ?? producto.codigo_barras ?? producto.sku));
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            title="Copiar"
                                            style={{ cursor: 'pointer', fontSize: 18, color: '#555', padding: 4 }}
                                        />
                                    )}
                                    {copied && (
                                        <span style={{ fontSize: 12, color: '#10b981' }}>¡Copiado!</span>
                                    )}
                                </div>
                                <input
                                    value={String(editData.codigo_barras ?? producto.codigo_barras ?? "")}
                                    onChange={(e) => handleEdit("codigo_barras", e.target.value)}
                                    placeholder="Ingresar código"
                                    style={{ maxWidth: 320, marginTop: 6 }}
                                />
                            </div>
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
                                    style={{ maxHeight: 120, overflowY: "auto" }}
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
                                    style={{ maxHeight: 120, overflowY: "auto" }}
                                />
                            </p>
                            <p>
                                <strong>Activo:</strong>{" "}
                                {producto.activo ? <span className="activo">✔ Sí</span> : <span className="inactivo">✘ No</span>}
                            </p>
                            <p><strong>Creado en:</strong> {formatFecha(producto.creado_en)}</p>
                            <p><strong>Última actualización:</strong> {formatFecha(producto.updated_at)}</p>
                        </div>

                        <div className="editor-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                className="btn-volver"
                                onClick={() => setShowRemoveModal(true)}
                                title="Eliminar / retirar stock"
                            >
                                🗑 Eliminar producto
                            </button>
                            <button
                                className="btn-guardar"
                                onClick={handleSave}
                                disabled={!changed}
                                title={!changed ? "No hay cambios para guardar" : "Guardar cambios"}
                            >
                                💾 Guardar cambios
                            </button>
                        </div>
                    </div>
                </div>
            </IonContent>
            {/* Modal para retirar stock */}
            {showRemoveModal && (
                <div
                    className="modal-overlay"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                    }}
                >
                    <div
                        className="modal-card"
                        style={{
                            width: '90%',
                            maxWidth: 420,
                            background: '#000000',
                            color: '#ffffff',
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                            position: 'relative',
                        }}
                    >
                        <button
                            onClick={() => { setShowRemoveModal(false); setRemoveQty(""); }}
                            title="Cerrar"
                            style={{
                                position: 'absolute',
                                top: 10,
                                left: 10,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 4,
                            }}
                        >
                            <IonIcon icon={closeOutline} style={{ fontSize: 22, color: '#ffffff' }} />
                        </button>
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <h3 style={{ margin: '8px 0 12px 0', fontSize: 18, color: '#ffffff' }}>¿Cuántos productos deseas eliminar?</h3>
                            <input
                                type="number"
                                min={0}
                                value={removeQty}
                                onChange={(e) => setRemoveQty(e.target.value)}
                                placeholder="0"
                                style={{
                                    width: '100%',
                                    padding: 10,
                                    borderRadius: 8,
                                    border: '1px solid #333333',
                                    outline: 'none',
                                    background: '#111111',
                                    color: '#ffffff',
                                }}
                            />
                            <button
                                className="btn-guardar"
                                onClick={handleRemoveStock}
                                style={{ marginTop: 14, width: '100%' }}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </IonPage>
    );
}
