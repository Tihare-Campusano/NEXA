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
import { useHistory, useLocation } from "react-router-dom";
import "./product-form.css";

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

  // --- Estados del componente ---
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    marca: "",
    modelo: "",
    categoria_id: "",
    compatibilidad: "",
    observaciones: "",
  });

  const [loading, setLoading] = useState(false);

  // --- Efecto: lectura de código escaneado ---
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

  // --- Navegación a la página de IA ---
  const handleNext = () => {
    if (!form.codigo.trim()) {
      alert("Por favor, ingresa un código para el producto antes de continuar.");
      return;
    }
    if (!form.categoria_id) {
      alert("Debes seleccionar una categoría antes de continuar.");
      return;
    }
    history.push({
      pathname: "/tabs/registro/ia",
      state: { formData: form },
    });
  };

  // --- Renderizado ---
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
        </div>

        {loading && (
          <div className="spinner-container">
            <IonSpinner name="crescent" />
          </div>
        )}

        <IonButton
          color="success"
          expand="block"
          onClick={handleNext}
          disabled={loading || !form.codigo}
        >
          {loading ? "Procesando..." : "Siguiente"}
        </IonButton>
      </IonCardContent>
    </IonCard>
  );
}
