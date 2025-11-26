import React from "react";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonText,
} from "@ionic/react";

import { supabase } from "../../../supabaseClient";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { Capacitor } from "@capacitor/core";
import { Toast } from "@capacitor/toast";

import { descargarAndroid } from "../../../plugins/downloadPlugin";

import "./report_all_products.css";

// 🔹 Datos del producto
interface Producto {
  codigo: string;
  nombre: string;
  cantidad: number;
  estado: string;
  categoria: string;
}

interface ReportAllProductsProps {
  onDidDismiss: () => void;
}

const ReportAllProducts: React.FC<ReportAllProductsProps> = ({ onDidDismiss }) => {
  const isWeb = Capacitor.getPlatform() === "web";

  // Notificación universal
  const notify = async (text: string) => {
    await Toast.show({ text });
  };

  // ------------------------------------------------------------------
  // 🔹 Obtener productos
  // ------------------------------------------------------------------
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase.from("productos").select(`
      id,
      nombre,
      estado,
      disponibilidad,
      stock
    `);

    if (error) throw error;

    return (data ?? []).map((p: any) => ({
      codigo: p.id ?? "",
      nombre: p.nombre ?? "Sin nombre",
      cantidad: p.stock ?? 0,
      estado: p.estado ?? "Sin estado",
      categoria: p.disponibilidad ?? "General",
    }));
  };

  // ------------------------------------------------------------------
  // 🔹 Guardar archivo en Web
  // ------------------------------------------------------------------
  const guardarWeb = (fileName: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);
  };

  // ------------------------------------------------------------------
  // 🔹 EXPORTAR PDF
  // ------------------------------------------------------------------
  const exportarPDF = async () => {
    notify("Generando PDF…");

    try {
      const productos = await fetchProductos();

      const doc = new jsPDF();
      doc.text("Reporte de Productos", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Stock", "Estado", "Categoría"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.cantidad,
          p.estado,
          p.categoria,
        ]),
      });

      const timestamp = Date.now();
      const fileName = `reporte_productos_${timestamp}.pdf`;

      if (isWeb) {
        const blob = doc.output("blob");
        guardarWeb(fileName, blob);
      } else {
        const base64Data = doc.output("datauristring").split(",")[1];

        // --- Android descarga REAL ---
        await descargarAndroid(fileName, base64Data, "application/pdf");
      }

      notify("PDF listo 🎉");
    } catch (e) {
      notify("Error al generar PDF.");
    }
  };

  // ------------------------------------------------------------------
  // 🔹 EXPORTAR EXCEL
  // ------------------------------------------------------------------
  const exportarExcel = async () => {
    notify("Generando Excel…");

    try {
      const productos = await fetchProductos();

      const ws = XLSX.utils.json_to_sheet(
        productos.map((p) => ({
          Código: p.codigo,
          Nombre: p.nombre,
          Cantidad: p.cantidad,
          Estado: p.estado,
          Categoría: p.categoria,
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos");

      const timestamp = Date.now();
      const fileName = `reporte_productos_${timestamp}.xlsx`;

      if (isWeb) {
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        guardarWeb(fileName, new Blob([excelBuffer]));
      } else {
        const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });

        // --- Android descarga REAL ---
        await descargarAndroid(
          fileName,
          base64Data,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
      }

      notify("Excel listo 🎉");
    } catch {
      notify("Error al generar Excel.");
    }
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reporte de Productos</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText>
          <h3 style={{ textAlign: "center", fontWeight: "bold" }}>
            ¿Deseas descargar en PDF o Excel?
          </h3>
          <p style={{ textAlign: "center" }}>
            Los archivos se guardarán automáticamente.
          </p>
        </IonText>

        <div style={{ padding: 20 }}>
          <IonButton expand="block" color="danger" onClick={exportarPDF}>
            Descargar PDF
          </IonButton>

          <IonButton
            expand="block"
            color="success"
            onClick={exportarExcel}
            style={{ marginTop: 10 }}
          >
            Descargar Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportAllProducts;
