import { useEffect, useRef, useState, useCallback } from "react";
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
    codigo_barras?: string | null;
    marca?: string | null;
    modelo?: string | null;
    compatibilidad?: string | null;
    sku?: string | null;
    nombre: string;
    categoria_id?: number | null;
    unidad?: string | null;
    stock_minimo?: number | null;
    observaciones?: string | null;
    activo?: boolean;
    creado_en?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    categoria?: { nombre?: string | null } | null;
    stock?: number | null;
    imagen_url?: string | null; // URL REAL de la imagen
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
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const formatFecha = useCallback((fecha: string | null | undefined) => {
        if (!fecha) return "N/A";
        try {
            const d = new Date(fecha);
            const day = `${d.getDate()}`.padStart(2, "0");
            const month = `${d.getMonth() + 1}`.padStart(2, "0");
            const year = d.getFullYear();
            const hours = `${d.getHours()}`.padStart(2, "0");
            const minutes = `${d.getMinutes()}`.padStart(2, "0");
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch {
            return fecha;
        }
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

            // OBTIENE imagen_url DIRECTAMENTE, SIN PROCESAR
            const { data, error } = await supabase
                .from("productos")
                .select("*, imagen_url, categoria:categorias(nombre)")
                .eq("id", Number(id))
                .single();

            if (!mountedRef.current || ignore) return;

            if (error) {
                console.error("Error al obtener producto:", error.message);
                setProducto(null);
            } else {
                const d = data as Producto;
                const codigo_barras = (d as any).codigo_barras ?? (d as any).sku ?? null;
                const normalized: Producto = {
                    ...(d as any),
                    codigo_barras,
                    stock: (d as any).stock ?? (d as any).cantidad ?? null,
                };
                setProducto(normalized);
                setImgError(false);

                console.log("🔎 Imagen URL cargada:", normalized.imagen_url);
            }
            setLoading(false);
        };

        fetchProducto();
        return () => {
            ignore = true;
        };
    }, [id]);

    const handleEdit = (field: keyof Producto, value: any) => {
        setEditData((prev) => ({ ...prev, [field]: value }));
        setChanged(true);
    };

    const handleSave = async () => {
        if (!id || !changed) return;

        const payload: Record<string, any> = {};
        Object.keys(editData).forEach((k) => {
            (payload as any)[k] = (editData as any)[k];
        });

        const { error } = await supabase.from("productos").update(payload).eq("id", Number(id));
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

        const actual = Number(producto.stock ?? 0);
        if (actual <= 0) {
            alert("Ya no hay más stock disponible");
            return;
        }
        if (qty > actual) {
            alert("No es posible eliminar esa cantidad; supera el stock disponible");
            return;
        }

        const nuevo = Math.max(0, actual - qty);
        const { error } = await supabase.from("productos").update({ stock: nuevo }).eq("id", Number(producto.id));
        if (error) {
            alert("Error al actualizar el stock");
            return;
        }

        setProducto((prev) => (prev ? ({ ...prev, stock: nuevo } as Producto) : prev));
        setShowRemoveModal(false);
        setRemoveQty("");
        alert("Stock actualizado ✅");
    };

    const copyCodigo = async () => {
        const text = String(editData.codigo_barras ?? producto?.codigo_barras ?? producto?.sku ?? "");
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            alert("Copiado: " + text);
        }
    };

    const placeholder =
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'>
            <rect width='100%' height='100%' fill='#f3f4f6'/>
            <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='20'>No hay imagen</text>
        </svg>`
        );

    // URL REAL desde la base de datos (sin trucos, sin created_at)
    const imageUrl = !imgError && producto?.imagen_url ? producto.imagen_url : placeholder;

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
                    <div className="editor-producto-card new-layout">
                        <div className="top-row">
                            <div className="image-wrap">
                                <img
                                    src={imageUrl}
                                    alt={producto.nombre}
                                    onError={() => setImgError(true)}
                                    className="product-image"
                                />
                            </div>

                            <div className="header-info">
                                <div className="back-icon" onClick={() => history.goBack()} title="Volver">
                                    <IonIcon icon={arrowBackOutline} />
                                </div>

                                <h2 className="product-title">{producto.nombre}</h2>

                                <div className="barcode-row">
                                    <div className="barcode-box">
                                        <span className="barcode-label">Código de Barras</span>
                                        <div className="barcode-value">
                                            <code>{String(editData.codigo_barras ?? producto.codigo_barras ?? producto.sku ?? "N/A")}</code>
                                            {(producto.codigo_barras || producto.sku) && (
                                                <button className="copy-btn" onClick={copyCodigo} title="Copiar código">
                                                    <IonIcon icon={copyOutline} />
                                                </button>
                                            )}
                                            {copied && <span className="copied-badge">¡Copiado!</span>}
                                        </div>
                                    </div>

                                    <div className="meta-row">
                                        <div><strong>ID:</strong> {String(producto.id)}</div>
                                        <div><strong>Stock:</strong> {producto.stock ?? 0}</div>
                                        <div><strong>Creado:</strong> {formatFecha(producto.created_at)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="editor-body">
                            <div>
                                <label className="field-label">Nombre</label>
                                <input
                                    value={String(editData.nombre ?? producto.nombre ?? "")}
                                    onChange={(e) => handleEdit("nombre", e.target.value)}
                                />

                                <label className="field-label">Marca</label>
                                <input
                                    value={String(editData.marca ?? producto.marca ?? "")}
                                    onChange={(e) => handleEdit("marca", e.target.value)}
                                />

                                <label className="field-label">Modelo</label>
                                <input
                                    value={String(editData.modelo ?? producto.modelo ?? "")}
                                    onChange={(e) => handleEdit("modelo", e.target.value)}
                                />

                                <label className="field-label">Compatibilidad</label>
                                <textarea
                                    value={String(editData.compatibilidad ?? producto.compatibilidad ?? "")}
                                    onChange={(e) => handleEdit("compatibilidad", e.target.value)}
                                />

                                <label className="field-label">Observaciones</label>
                                <textarea
                                    value={String(editData.observaciones ?? producto.observaciones ?? "")}
                                    onChange={(e) => handleEdit("observaciones", e.target.value)}
                                />
                            </div>

                            <div>
                                <p><strong>SKU:</strong> {producto.sku ?? "N/A"}</p>
                                <p><strong>Categoría:</strong> {producto.categoria?.nombre ?? "Sin categoría"}</p>
                                <p><strong>Unidad:</strong> {producto.unidad ?? "N/A"}</p>
                                <p><strong>Stock mínimo:</strong> {producto.stock_minimo ?? "N/A"}</p>

                                <p>
                                    <strong>Activo:</strong>{" "}
                                    {producto.activo ? <span className="activo">✔ Sí</span> : <span className="inactivo">✘ No</span>}
                                </p>

                                <p><strong>Última actualización:</strong> {formatFecha(producto.updated_at)}</p>
                            </div>
                        </div>

                        <div className="editor-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                className="btn-volver"
                                onClick={() => setShowRemoveModal(true)}
                                title="Eliminar / retirar stock"
                            >
                                🗑 Retirar stock
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

            {showRemoveModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <button className="modal-close" onClick={() => { setShowRemoveModal(false); setRemoveQty(""); }}>
                            <IonIcon icon={closeOutline} />
                        </button>
                        <div style={{ textAlign: 'center', marginTop: 8 }}>
                            <h3 className="modal-title">¿Cuántos productos deseas retirar?</h3>
                            <input
                                type="number"
                                min={0}
                                value={removeQty}
                                onChange={(e) => setRemoveQty(e.target.value)}
                                placeholder="0"
                                className="modal-input"
                            />
                            <button className="btn-guardar" onClick={handleRemoveStock} style={{ marginTop: 12, width: '100%' }}>
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </IonPage>
    );
}
