import {
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
} from "@ionic/react";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useHistory } from "react-router-dom";
import "./product-form.css";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export default function FormularioRegistro() {
    const history = useHistory();
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
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: CustomEvent) => {
        const { name, value } = e.detail;
        setForm({ ...form, [name]: value });
    };

    const handleCodigoChange = async (e: CustomEvent) => {
        const codigo = e.detail.value;
        setForm({ ...form, codigo });

        if (codigo.length >= 4) {
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
                let disponibilidad =
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
                    estado: producto.estado || "-----",
                });
            } else {
                setForm({ ...form, stock: "", disponibilidad: "", estado: "" });
            }

            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.codigo || !form.nombre || !form.marca || !form.modelo) {
            alert("Por favor completa todos los campos obligatorios.");
            return;
        }

        setLoading(true);

        const { data: existente } = await supabase
            .from("productos")
            .select("id")
            .eq("codigo_barras", form.codigo)
            .maybeSingle();

        if (existente) {
            await supabase
                .from("productos")
                .update({
                    nombre: form.nombre,
                    marca: form.marca,
                    modelo: form.modelo,
                    categoria_id: form.categoria_id || null,
                    compatibilidad: form.compatibilidad,
                    observaciones: form.observaciones,
                })
                .eq("codigo_barras", form.codigo);
        } else {
            await supabase.from("productos").insert([
                {
                    codigo_barras: form.codigo,
                    nombre: form.nombre,
                    marca: form.marca,
                    modelo: form.modelo,
                    categoria_id: form.categoria_id || null,
                    compatibilidad: form.compatibilidad,
                    observaciones: form.observaciones,
                    activo: true,
                },
            ]);
        }

        setLoading(false);
        history.push("/registro/camera");
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
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? "Procesando..." : "Siguiente"}
                </IonButton>
            </IonCardContent>
        </IonCard>
    );
}
