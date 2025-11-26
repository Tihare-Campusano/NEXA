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

// 👇 ESTA ES LA RUTA CORRECTA SEGÚN TU PROYECTO
import { descargarAndroid } from "../../../downloadPlugins/downloadPlugin";

import "./report_all_products.css";

// -------------------------
// INTERFACES
// -------------------------
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

  const notificar = async (msg: string) => {
    await Toast.show({ text: msg });
  };

  // ----------------------
  // FETCH PRODUCTOS
  // ----------------------
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select(`
        sku,
        nombre,
        estado,
        marca,
        stock(cantidad)
      `);

    if (error) throw error;

    return (data ?? []).map((p: any) => ({
      codigo: p.sku ?? "",
      nombre: p.nombre ?? "",
      cantidad: p.stock?.[0]?.cantidad ?? 0,
      estado: p.estado ?? "Sin estado",
      categoria: p.marca ?? "General",
    }));
  };

  // ----------------------
  // DESCARGA WEB
  // ----------------------
  const descargarWeb = (fileName: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ----------------------
  // EXPORTAR PDF
  // ----------------------
  const exportarPDF = async () => {
    try {
      await notificar("Generando PDF...");
      const productos = await fetchProductos();

      const doc = new jsPDF();
      doc.text("Reporte de Productos", 10, 10);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Cantidad", "Estado", "Categoría"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.cantidad,
          p.estado,
          p.categoria,
        ]),
      });

      const nombre = `reporte_${Date.now()}.pdf`;

      if (isWeb) {
        const blob = doc.output("blob") as Blob;
        descargarWeb(nombre, blob);
        return;
      }

      // ANDROID → Convertir PDF en base64
      const base64 = doc.output("datauristring").split(",")[1];

      await descargarAndroid(nombre, base64, "application/pdf");
      await notificar("PDF guardado en /Descargas y abierto ✔️");
    } catch (err) {
      console.log("Error PDF:", err);
      await notificar("No se pudo generar el PDF.");
    }
  };

  // ----------------------
  // EXPORTAR EXCEL
  // ----------------------
  const exportarExcel = async () => {
    try {
      await notificar("Generando Excel...");
      const productos = await fetchProductos();

      const rows = productos.map((p) => ({
        Código: p.codigo,
        Nombre: p.nombre,
        Cantidad: p.cantidad,
        Estado: p.estado,
        Categoría: p.categoria,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos");

      const nombre = `reporte_${Date.now()}.xlsx`;

      if (isWeb) {
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        descargarWeb(nombre, blob);
        return;
      }

      // ANDROID → convertir Excel a base64
      const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });

      await descargarAndroid(
        nombre,
        base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      await notificar("Excel guardado en /Descargas y abierto ✔️");
    } catch (err) {
      console.log("Error Excel:", err);
      await notificar("No se pudo generar el Excel.");
    }
  };

  // ----------------------
  // UI
  // ----------------------
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
            ¿Descargar PDF o Excel?
          </h3>
        </IonText>

        <div style={{ padding: 20 }}>
          <IonButton
            expand="block"
            color="danger"
            onClick={exportarPDF}
            style={{ marginBottom: 10 }}
          >
            Descargar PDF
          </IonButton>

          <IonButton
            expand="block"
            color="success"
            onClick={exportarExcel}
          >
            Descargar Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportAllProducts;
