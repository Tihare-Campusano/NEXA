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
    categoria_id: "", // Se mantiene como string para el select
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
      setForm((prev) => ({ ...prev, ...fromIA }));
      setModoGuardar(true);
    }
  }, [fromIA]);

  useEffect(() => {
    const scanned = (location.state as any)?.scannedCode as string | undefined;
    if (scanned) {
      setForm((prev) => ({ ...prev, codigo: scanned }));
      history.replace(history.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // --- Manejadores de eventos ---
  const handleChange = (e: CustomEvent) => {
    const target = e.target as HTMLIonInputElement;
    const { name } = target;
    const value = (e as any).detail?.value ?? "";
    setForm((prev) => ({ ...prev, [name!]: value }));
  };

  const handleCodigoChange = (e: CustomEvent) => {
    const value = (e as any).detail?.value ?? "";
    setForm((prev) => ({ ...prev, codigo: value }));
  };

  // --- NAVEGACIÓN A LA PÁGINA DE IA (handleNext) ---
  const handleNext = () => {
    if (!form.codigo.trim()) {
      alert("Por favor, ingresa un código para el producto antes de continuar.");
      return;
    }
    // 🛑 VALIDACIÓN CRÍTICA: La clave foránea es NOT NULL en DB
    if (!form.categoria_id) {
      alert("¡Advertencia! Debes seleccionar una categoría antes de usar la cámara.");
      return;
    }
    history.push({
      pathname: "/tabs/registro/ia",
      // ✅ Pasamos TODOS los datos del formulario al estado de la IA
      state: { formData: form },
    });
  };

  // --- FUNCIÓN DE GUARDADO FINAL ---
  const handleGuardar = async () => {
    setLoading(true);

    const { data: existente } = await supabase
      .from("productos")
      .select("id")
      .eq("codigo_barras", form.codigo)
      .maybeSingle();

    // ✅ Mapeo de datos para la base de datos (usando 'unidad' y valores seguros)
    const dataProducto = {
      codigo_barras: form.codigo,

      // 🛑 Campos de metadatos (Deben ser NOT NULLs)
      nombre: form.nombre || "N/A",
      marca: form.marca || "N/A",
      modelo: form.modelo || "N/A",
      categoria_id: form.categoria_id ? parseInt(form.categoria_id, 10) : null,
      compatibilidad: form.compatibilidad || null,
      observaciones: form.observaciones || null,

      // ✅ Campos de Stock e IA
      unidad: form.stock ? parseInt(form.stock, 10) : 0, // <-- Columna correcta para inventario
      disponibilidad: form.disponibilidad || "Sin stock",
      estado: form.estadoIA || form.estado || "No Clasificado",
      imagen_url: form.imagen_url || null,

      activo: true, // Asumimos NOT NULL
    };

    let error;
    if (existente) {
      // Si existe, actualiza
      ({ error } = await supabase.from("productos").update(dataProducto).eq("id", existente.id));
    } else {
      // Si es nuevo, insertamos la fila COMPLETA
      ({ error } = await supabase.from("productos").insert([dataProducto]));
    }

    setLoading(false);

    if (error) {
      alert(`❌ Error al guardar el producto: ${error.message}`);
    } else {
      alert("✅ Producto guardado correctamente.");
      history.push("/inventario");
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
            <IonLabel position="stacked" className="form-label">
              Categoría
            </IonLabel>
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
              <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <IonInput value={form[field as keyof typeof form]} readonly className="form-input readonly-input" />
            </div>
          ))}
        </div>

        {loading && (
          <div className="spinner-container">
            <IonSpinner name="crescent" />
          </div>
        )}

        <IonButton color="success" expand="block" onClick={modoGuardar ? handleGuardar : handleNext} disabled={loading || !form.codigo}>
          {loading ? "Procesando..." : modoGuardar ? "Guardar" : "Siguiente"}
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
}