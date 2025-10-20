import {
    IonInput,
    IonButton,
    IonSpinner,
    IonCard,
    IonCardContent,
    IonSelect,
    IonSelectOption,
    IonItem,
    IonLabel,
} from "@ionic/react";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useHistory, useLocation } from "react-router-dom";
import "./product-form.css";

// --- Inicialización de Supabase ---
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

// --- Lista Fija de Categorías ---
const categoriasFijas = [
    { id: 1, nombre: "Impresora" },
    { id: 2, nombre: "Monitor" },
    { id: 3, nombre: "Smartphone" },
    { id: 4, nombre: "Toner" },
    { id: 5, nombre: "Torre (PC)" },
];

export default function FormularioRegistro() {
    const history = useHistory();
    const location = useLocation();
    const fromIA = (location.state as any)?.formData || null;

    // --- Estados del componente ---
    const [form, setForm] = useState({
        codigo: "",
        nombre: "",
        marca: "",
        modelo: "",
        categoria_id: "",
        compatibilidad: "",
        observaciones: "",
        stock: "",
        disponibilidad: "",
        estado: "",
        imagen_url: "",
        estadoIA: "",
    });

    const [loading, setLoading] = useState(false);
    const [modoGuardar, setModoGuardar] = useState(false);

    // --- Efectos ---
    useEffect(() => {
        if (fromIA) {
            setForm(prev => ({ ...prev, ...fromIA }));
            setModoGuardar(true);
        }
    }, [fromIA]);

    // --- Manejadores de eventos ---
    const handleChange = (e: CustomEvent) => {
        const target = e.target as HTMLIonInputElement;
        const { name, value } = target;
        setForm(prev => ({ ...prev, [name!]: value }));
    };

    const handleCodigoChange = async (e: CustomEvent) => {
        const codigo = e.detail.value ?? "";
        setForm(prev => ({ ...prev, codigo }));

        if (!codigo || codigo.length < 4) return;

        setLoading(true);
        const { data: producto, error } = await supabase
            .from("productos")
            .select("*, stock(cantidad)")
            .eq("codigo_barras", codigo)
            .maybeSingle();

        if (error) {
            console.error("Error al buscar producto:", error);
            setLoading(false);
            return;
        }

        if (producto) {
            const cantidadStock = producto.stock[0]?.cantidad || 0;
            const disponibilidad =
                cantidadStock <= 5 ? "Bajo stock" : cantidadStock <= 15 ? "Medio stock" : "Alto stock";

            setForm({
                codigo: producto.codigo_barras,
                nombre: producto.nombre,
                marca: producto.marca,
                modelo: producto.modelo,
                categoria_id: producto.categoria_id?.toString() || "",
                compatibilidad: producto.compatibilidad || "",
                observaciones: producto.observaciones || "",
                stock: cantidadStock.toString(),
                disponibilidad,
                estado: producto.estado || "",
                imagen_url: producto.imagen_url || "",
                estadoIA: "",
            });
        } else {
            // ✅ MEJORA: Si el producto no existe, limpiamos el formulario
            // pero mantenemos el código y establecemos un stock inicial.
            setForm({
                codigo: codigo,
                nombre: "",
                marca: "",
                modelo: "",
                categoria_id: "",
                compatibilidad: "",
                observaciones: "",
                stock: "0",
                disponibilidad: "Sin stock",
                estado: "",
                imagen_url: "",
                estadoIA: "",
            });
        }

        setLoading(false);
    };

    // --- NAVEGACIÓN A LA PÁGINA DE IA ---
    const handleNext = () => {
        // ✅ CORRECCIÓN: Se añade una validación para asegurar que el código exista.
        if (!form.codigo.trim()) {
            alert("Por favor, ingresa un código para el producto antes de continuar.");
            return; // Detiene la navegación si no hay código.
        }

        history.push({
            pathname: "/tabs/registro/ia",
            state: { formData: form },
        });
    };

    const handleGuardar = async () => {
        setLoading(true);

        const { data: existente } = await supabase
            .from("productos")
            .select("id")
            .eq("codigo_barras", form.codigo)
            .maybeSingle();

        const dataProducto = {
            codigo_barras: form.codigo,
            nombre: form.nombre,
            marca: form.marca,
            modelo: form.modelo,
            categoria_id: form.categoria_id ? parseInt(form.categoria_id, 10) : null,
            compatibilidad: form.compatibilidad,
            observaciones: form.observaciones,
            estado: form.estadoIA || form.estado,
            imagen_url: form.imagen_url || null,
            activo: true,
        };

        let error;
        if (existente) {
            ({ error } = await supabase.from("productos").update(dataProducto).eq("id", existente.id));
        } else {
            ({ error } = await supabase.from("productos").insert([dataProducto]));
        }

        setLoading(false);

        if (error) {
            alert(`❌ Error al guardar el producto: ${error.message}`);
        } else {
            alert("✅ Producto guardado correctamente.");
            history.push("/inventario"); // Considera si esta ruta es correcta o debería ser /tabs/productos
        }
    };

    // --- Renderizado del componente ---
    return (
        <IonCard className="form-card">
            <IonCardContent>
                <div className="form-list">
                    {["codigo", "nombre", "marca", "modelo", "compatibilidad", "observaciones"].map((field) => (
                        <div key={field} className="form-field">
                            <label className="form-label">
                                {field === "codigo" ? "Código" : field.charAt(0).toUpperCase() + field.slice(1)}
                            </label>
                            <IonInput
                                type="text"
                                name={field}
                                value={form[field as keyof typeof form]}
                                onIonChange={field === "codigo" ? handleCodigoChange : handleChange}
                                className="form-input"
                            />
                        </div>
                    ))}

                    <IonItem className="form-field">
                        <IonLabel position="stacked" className="form-label">Categoría</IonLabel>
                        <IonSelect
                            name="categoria_id"
                            value={form.categoria_id}
                            placeholder="Selecciona una categoría"
                            onIonChange={handleChange}
                            interface="popover"
                        >
                            {categoriasFijas.map((cat) => (
                                <IonSelectOption key={cat.id} value={cat.id.toString()}>
                                    {cat.nombre}
                                </IonSelectOption>
                            ))}
                        </IonSelect>
                    </IonItem>

                    {["stock", "disponibilidad", "estado"].map((field) => (
                        <div key={field} className="form-field readonly">
                            <label className="form-label">
                                {field.charAt(0).toUpperCase() + field.slice(1)}
                            </label>
                            <IonInput
                                value={form[field as keyof typeof form]}
                                readonly
                                className="form-input readonly-input"
                            />
                        </div>
                    ))}
                </div>

                {loading && (
                    <div className="spinner-container">
                        <IonSpinner name="crescent" />
                    </div>
                )}

                <IonButton
                    color="success"
                    expand="block"
                    onClick={modoGuardar ? handleGuardar : handleNext}
                    disabled={loading || !form.codigo}
                >
                    {loading ? "Procesando..." : modoGuardar ? "Guardar" : "Siguiente"}
                </IonButton>
            </IonCardContent>
        </IonCard>
    );
}