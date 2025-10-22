import React, { useState } from "react";
import { FaFileAlt } from "react-icons/fa";
import {
  IonPage,
  IonContent,
  IonModal,
} from "@ionic/react";

// --- Gráficos (Dashboard) ---
import StockChart from "../../components/reports/graficos/prod_mas_stock";
import EstadoProductosChart from "../../components/reports/graficos/porcen_prod_por_estado";

// --- Componentes ---
import ReportesDropdown from "../../components/reports/ReportesDropdown";
import HeaderApp from "../../components/header_app";

// 👇 1. Importa TODOS los componentes de reporte
import ReportAllProducts from "../../components/reports/reporte_productos_almacenados/report_all_products";
import ReportBadState from "../../components/reports/reporte_productos_mal_estado/report_bad_state";
import ReportNewProduct from "../../components/reports/reporte_productos_nuevos/report_new_product";
import ReportUsedProduct from "../../components/reports/reporte_productos_usados/report_used_product";
import ReportRegisterForMonth from "../../components/reports/reporte_registros_por_mes/report_register_for_month";
import ReportRegisterForWeek from "../../components/reports/reporte_registros_por_semana/report_register_for_week";
import ReportStockMonth from "../../components/reports/reporte_stock_mensual/report_stock_month"; // 👈 AÑADIDO

// Opcional: un tipo para saber qué modal abrir
type ReporteModalId =
  | "all_products"
  | "bad_state"
  | "new_product"
  | "used_product"
  | "register_month"
  | "register_week"
  | "stock_month"; // 👈 AÑADIDO

export default function Reportes() {
  const [modalAbierto, setModalAbierto] = useState<ReporteModalId | null>(null);

  // 👇 2. Opciones del dropdown actualizadas con todas las opciones
  const reportOptions = [
    {
      label: "Todos los Productos",
      onClick: () => setModalAbierto("all_products"),
    },
    {
      label: "Productos en Mal Estado",
      onClick: () => setModalAbierto("bad_state"),
    },
    {
      label: "Productos Nuevos",
      onClick: () => setModalAbierto("new_product"),
    },
    {
      label: "Productos Usados",
      onClick: () => setModalAbierto("used_product"),
    },
    {
      label: "Registros por Mes",
      onClick: () => setModalAbierto("register_month"),
    },
    {
      label: "Registros por Semana",
      onClick: () => setModalAbierto("register_week"),
    },
    {
      label: "Stock Mensual",
      onClick: () => setModalAbierto("stock_month"), // 👈 AÑADIDO
    },
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

        {/* 👇 3. MODAL (con la clase CSS para el estilo) */}
        <IonModal
          isOpen={modalAbierto !== null}
          onDidDismiss={() => setModalAbierto(null)}
          // Clase para que el modal sea pequeño
          className="report-download-modal"
        >
          {/* 👇 4. Contenido dinámico del Modal */}
          
          {modalAbierto === "all_products" && (
            <ReportAllProducts onDidDismiss={() => setModalAbierto(null)} />
          )}

          {modalAbierto === "bad_state" && (
            <ReportBadState onDidDismiss={() => setModalAbierto(null)} />
          )}

          {modalAbierto === "new_product" && (
            <ReportNewProduct onDidDismiss={() => setModalAbierto(null)} />
          )}

          {modalAbierto === "used_product" && (
            <ReportUsedProduct onDidDismiss={() => setModalAbierto(null)} />
          )}
          
          {modalAbierto === "register_month" && (
            <ReportRegisterForMonth onDidDismiss={() => setModalAbierto(null)} />
          )}

          {modalAbierto === "register_week" && (
            <ReportRegisterForWeek onDidDismiss={() => setModalAbierto(null)} />
          )}

          {modalAbierto === "stock_month" && (
            <ReportStockMonth onDidDismiss={() => setModalAbierto(null)} /> // 👈 AÑADIDO
          )}

        </IonModal>
      </IonContent>
    </IonPage>
  );
}