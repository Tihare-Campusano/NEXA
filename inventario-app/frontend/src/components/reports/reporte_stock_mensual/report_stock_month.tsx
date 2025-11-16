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
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import { FileOpener } from "@capacitor-community/file-opener";
import { Toast } from "@capacitor/toast";
import "./report_stock_month.css";

interface ReportStockMonthProps {
  onDidDismiss: () => void;
}

const ReportStockMonth: React.FC<ReportStockMonthProps> = ({ onDidDismiss }) => {

  // 🔹 Mostrar toast
  const mostrarNotificacion = async (mensaje: string) => {
    await Toast.show({ text: mensaje, duration: "long" });
  };

  // 🔹 Solicitar permiso de almacenamiento
  const solicitarPermisoDescarga = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const check = await Filesystem.checkPermissions();
        if (check.publicStorage !== "granted") {
          const request = await Filesystem.requestPermissions();
          if (request.publicStorage !== "granted") {
            mostrarNotificacion(
              "Por favor, concede permiso de almacenamiento para descargar archivos."
            );
            return false;
          }
        }
      } catch (err) {
        console.error("Error al verificar permisos de almacenamiento:", err);
        mostrarNotificacion("No se pudo obtener el permiso de almacenamiento.");
        return false;
      }
    }
    return true;
  };

  // 🔹 Obtener datos y ordenarlos por stock ascendente
  const getReportData = async () => {
    const date = new Date();
    const nombreMes = date.toLocaleString("es-ES", { month: "long", year: "numeric" });
    const mes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    const { data, error } = await supabase
      .from("productos")
      .select("sku, nombre, marca, estado, stock!inner(cantidad)");

    if (error) {
      console.error("❌ Error al obtener productos:", error.message);
      throw error;
    }

    const productos = (data ?? []).map((p: any) => ({
      codigo: p.sku,
      nombre: p.nombre,
      cantidad: p.stock[0]?.cantidad ?? 0,
      estado: p.estado || "Desconocido",
      categoria: p.marca || "General",
    })).sort((a, b) => a.cantidad - b.cantidad);

    return { productos, mes };
  };

  // 🔹 Guardar archivo y abrir
  const guardarEnDispositivo = async (fileName: string, base64Data: string, mimeType: string) => {
    try {
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      const fileUri = savedFile.uri;

      try {
        await FileOpener.open({ filePath: fileUri, contentType: mimeType });
      } catch (e) {
        console.error("Error al abrir archivo automáticamente:", e);
        mostrarNotificacion(
          "Archivo guardado. Búscalo en la carpeta Documentos de tu dispositivo."
        );
      }
    } catch (e) {
      console.error("Error al guardar archivo", e);
      mostrarNotificacion(
        "Error al guardar archivo. ¿Otorgaste permisos a la app?"
      );
    }
  };

  // 🔹 Exportar PDF
  const exportarPDF = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    mostrarNotificacion("Generando PDF...");

    try {
      const { productos, mes } = await getReportData();
      const doc = new jsPDF();
      doc.text(`📊 Reporte de Stock Mensual (${mes})`, 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Cantidad", "Estado", "Categoría"]],
        body: productos.map((p) => [p.codigo, p.nombre, p.cantidad, p.estado, p.categoria]),
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      doc.text(
        `Este reporte corresponde al mes de ${mes}.\nLos productos con menor stock aparecen arriba.`,
        14,
        finalY + 10
      );

      const base64Data = doc.output("datauristring").split(",")[1];
      const timestamp = new Date().getTime();
      await guardarEnDispositivo(`reporte_stock_${mes}_${timestamp}.pdf`, base64Data, "application/pdf");

      mostrarNotificacion("PDF descargado correctamente.");
    } catch (error) {
      console.error("Error PDF:", error);
      mostrarNotificacion("No se pudo generar el PDF.");
    }
  };

  // 🔹 Exportar Excel
  const exportarExcel = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    mostrarNotificacion("Generando Excel...");

    try {
      const { productos, mes } = await getReportData();
      const ws = XLSX.utils.json_to_sheet(productos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Stock ${mes}`);

      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const timestamp = new Date().getTime();
      await guardarEnDispositivo(
        `reporte_stock_${mes}_${timestamp}.xlsx`,
        base64Data,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      mostrarNotificacion("Excel descargado correctamente.");
    } catch (error) {
      console.error("Error Excel:", error);
      mostrarNotificacion("No se pudo generar el Excel.");
    }
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reporte de Stock</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Cancelar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText>
          <h3 style={{ textAlign: "center", fontWeight: "bold", marginTop: "1rem" }}>
            ¿Deseas descargar en formato PDF o Excel?
          </h3>
        </IonText>
        <div className="modal-buttons-container" style={{ padding: "20px" }}>
          <IonButton
            className="modal-button"
            color="danger"
            expand="block"
            onClick={exportarPDF}
            style={{ marginBottom: "10px" }}
          >
            Descargar PDF
          </IonButton>
          <IonButton
            className="modal-button"
            color="success"
            expand="block"
            onClick={exportarExcel}
          >
            Descargar Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportStockMonth;