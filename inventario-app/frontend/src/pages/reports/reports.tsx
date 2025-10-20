import React, { useState } from "react";
import { FaFileAlt } from "react-icons/fa";
import {
  IonPage,
  IonContent,
  IonModal, // 👈 1. Importa IonModal
} from "@ionic/react";

// --- Gráficos (Dashboard) ---
import StockChart from "../../components/reports/graficos/prod_mas_stock";
import EstadoProductosChart from "../../components/reports/graficos/porcen_prod_por_estado";

// --- Componentes ---
import ReportesDropdown from "../../components/reports/ReportesDropdown";
import HeaderApp from "../../components/header_app";

// 👇 2. Importa tu componente de reporte REFACTORIZADO
import ReportAllProducts from "../../components/reports/reporte_productos_almacenados/report_all_products";
// ... (Aquí importarías los otros, ej: ReportBadState)

// Opcional: un tipo para saber qué modal abrir
type ReporteModalId =
  | "all_products"
  | "bad_state"
  | "new_product"
  | "used_product"; //... etc

export default function Reportes() {
  // 👇 3. Estado para controlar qué modal está abierto
  const [modalAbierto, setModalAbierto] = useState<ReporteModalId | null>(null);

  // 👇 4. Opciones del dropdown: ahora ABREN EL MODAL
  const reportOptions = [
    {
      label: "Todos los Productos",
      onClick: () => setModalAbierto("all_products"),
    },
    {
      label: "Productos en Mal Estado",
      onClick: () => setModalAbierto("bad_state"),
      // (Esta opción aún no hará nada hasta que crees ReportBadState)
    },
    // ... (añade las otras opciones aquí)
    // { label: "Productos Nuevos", onClick: () => setModalAbierto("new_product") },
  ];

  return (
    <IonPage>
      <HeaderApp
        title="Reportes"
        icon={<FaFileAlt size={28} className="text-green-400" />}
      />
      <IonContent className="ion-padding">
        {/* 🔹 Botón desplegable */}
        <div
          style={{
            margin: "1rem 0",
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <ReportesDropdown options={reportOptions} />
        </div>

        {/* --- Gráficos (Dashboard) --- */}
        <StockChart />
        <br />
        <EstadoProductosChart />

        {/* 👇 5. MODAL: Se muestra cuando 'modalAbierto' no es null */}
        <IonModal
          isOpen={modalAbierto !== null}
          onDidDismiss={() => setModalAbierto(null)}
          // Clase para que el modal sea pequeño
          className="report-download-modal"
        >
          {/* 👇 6. Contenido dinámico del Modal 
            Aquí es donde llamas a tu componente limpio.
          */}
          
          {modalAbierto === "all_products" && (
            <ReportAllProducts onDidDismiss={() => setModalAbierto(null)} />
          )}

          {/* // Ejemplo de cómo añadirías el siguiente reporte:
          {modalAbierto === "bad_state" && (
            <ReportBadState onDidDismiss={() => setModalAbierto(null)} />
          )} 
          */}

        </IonModal>
      </IonContent>
    </IonPage>
  );
}