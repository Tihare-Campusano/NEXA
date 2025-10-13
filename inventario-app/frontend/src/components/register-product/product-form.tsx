import {
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonSpinner,
    IonCard,
    IonCardContent,
} from "@ionic/react";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useHistory, useLocation } from "react-router-dom";
import "./product-form.css";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export default function FormularioRegistro() {
    const history = useHistory();
    const location = useLocation();
    const fromIA = (location.state as any)?.formData || null;

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
    const [modoGuardar, setModoGuardar] = useState(false); // false = Siguiente, true = Guardar

    // Si volvemos desde la IA, cargamos esos datos
    useEffect(() => {
        if (fromIA) {
            setForm(prev => ({ ...prev, ...fromIA }));
            setModoGuardar(true);
        }
    }, [fromIA]);

    const handleChange = (e: CustomEvent) => {
        const input = e.target as HTMLIonInputElement;
        const name = input.name;
        const value = e.detail.value ?? "";
        setForm(prev => ({ ...prev, [name]: value }));
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
            console.error(error);
            setLoading(false);
            return;
        }

        if (producto) {
            const cantidadStock = producto.stock?.cantidad || 0;
            const disponibilidad =
                cantidadStock <= 5 ? "Bajo stock" : cantidadStock <= 15 ? "Medio stock" : "Alto stock";

            setForm({
                codigo: producto.codigo_barras,
                nombre: producto.nombre,
                marca: producto.marca,
                modelo: producto.modelo,
                categoria_id: producto.categoria_id || "",
                compatibilidad: producto.compatibilidad || "",
                observaciones: producto.observaciones || "",
                stock: cantidadStock.toString(),
                disponibilidad,
                estado: producto.estado || "",
                imagen_url: producto.imagen_url || "",
                estadoIA: producto.estadoIA || "",
            });
        } else {
            // Limpia para nuevo registro
            setForm(prev => ({
                ...prev,
                nombre: "",
                marca: "",
                modelo: "",
                categoria_id: "",
                compatibilidad: "",
                observaciones: "",
                stock: "",
                disponibilidad: "",
                estado: "",
            }));
        }

        setLoading(false);
    };

    const handleNext = () => {
        // Redirigir a la pantalla IA con los datos actuales
        history.push({
            pathname: "/registro/camera",
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
            categoria_id: form.categoria_id || null,
            compatibilidad: form.compatibilidad,
            observaciones: form.observaciones,
            estado: form.estadoIA || form.estado,
            imagen_url: form.imagen_url || null,
            activo: true,
        };

        if (existente) {
            await supabase.from("productos").update(dataProducto).eq("codigo_barras", form.codigo);
        } else {
            await supabase.from("productos").insert([dataProducto]);
        }

        setLoading(false);
        alert("✅ Producto guardado correctamente.");
        history.push("/inventario"); // o la ruta que tengas para volver
    };

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
                    disabled={loading}
                >
                    {loading ? "Procesando..." : modoGuardar ? "Guardar" : "Siguiente"}
                </IonButton>
            </IonCardContent>
        </IonCard>
    );
}