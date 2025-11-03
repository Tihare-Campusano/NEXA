import React, { useState } from "react";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonText,
  IonLoading,
} from "@ionic/react";
import { supabase } from "../../../supabaseClient";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import "./report_stock_month.css";

interface ReportStockMonthProps {
  onDidDismiss: () => void;
}

const ReportStockMonth: React.FC<ReportStockMonthProps> = ({ onDidDismiss }) => {
  const [isLoading, setIsLoading] = useState(false);

  // 🔹 Función para solicitar permisos en Android
  const solicitarPermisoDescarga = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const check = await Filesystem.checkPermissions();
        if (check.publicStorage !== "granted") {
          const request = await Filesystem.requestPermissions();
          if (request.publicStorage !== "granted") {
            alert(
              "Por favor, concede permiso de almacenamiento para descargar archivos."
            );
            return false;
          }
        }
      } catch (err) {
        console.error("Error al verificar permisos de almacenamiento:", err);
        alert("No se pudo obtener el permiso de almacenamiento.");
        return false;
      }
    }
    return true;
  };

  // 🔹 Obtener datos de productos y ordenarlos por stock ascendente
  const getReportData = async () => {
    const date = new Date();
    const nombreMes = date.toLocaleString("es-ES", {
      month: "long",
      year: "numeric",
    });
    const mes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    const { data, error } = await supabase
      .from("productos")
      .select("sku, nombre, marca, estado, stock!inner(cantidad)");

    if (error) {
      console.error("❌ Error al obtener productos:", error.message);
      throw error;
    }

    const mapped = (data ?? []).map((p: any) => ({
      codigo: p.sku,
      nombre: p.nombre,
      cantidad: p.stock[0]?.cantidad ?? 0,
      estado: p.estado || "desconocido",
      categoria: p.marca || "general",
    }));

    const ordenados = mapped.sort((a, b) => a.cantidad - b.cantidad);

    return { productos: ordenados, mes };
  };

  // 🔹 Guardar archivo en Descargas
  const guardarEnDispositivo = async (fileName: string, base64Data: string) => {
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.External, // Carpeta pública Descargas
      });
      alert(`Archivo guardado en Descargas como: ${fileName}`);
    } catch (e) {
      console.error("Error al guardar archivo", e);
      alert("Error al guardar archivo. ¿Otorgaste permisos a la app?");
    }
  };

  // 🔹 Exportar PDF
  const exportarPDF = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    setIsLoading(true);
    try {
      const { productos, mes } = await getReportData();
      const doc = new jsPDF();
      doc.text(`📊 Reporte de Stock Mensual (${mes})`, 14, 15);

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

      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      doc.text(
        `Este reporte corresponde al mes de ${mes}.\nLos productos con menor stock aparecen arriba.`,
        14,
        finalY + 10
      );

      const base64Data = doc.output("datauristring").split(",")[1];
      const timestamp = new Date().getTime();
      await guardarEnDispositivo(`reporte_stock_${mes}_${timestamp}.pdf`, base64Data);
    } catch (error) {
      console.error("Error PDF:", error);
      alert("No se pudo generar el PDF.");
    }
    setIsLoading(false);
    onDidDismiss();
  };

  // 🔹 Exportar Excel
  const exportarExcel = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    setIsLoading(true);
    try {
      const { productos, mes } = await getReportData();
      const ws = XLSX.utils.json_to_sheet(productos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Stock ${mes}`);

      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const timestamp = new Date().getTime();
      await guardarEnDispositivo(`reporte_stock_${mes}_${timestamp}.xlsx`, base64Data);
    } catch (error) {
      console.error("Error Excel:", error);
      alert("No se pudo generar el Excel.");
    }
    setIsLoading(false);
    onDidDismiss();
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
        <IonLoading isOpen={isLoading} message={"Generando reporte..."} />
        <IonText>
          <h3
            style={{
              textAlign: "center",
              fontWeight: "bold",
              marginTop: "1rem",
            }}
          >
            ¿Deseas descargar en formato PDF o Excel?
          </h3>
        </IonText>
        <div className="modal-buttons-container">
          <IonButton
            className="modal-button"
            color="danger"
            expand="block"
            onClick={exportarPDF}
          >
            PDF
          </IonButton>
          <IonButton
            className="modal-button"
            color="success"
            expand="block"
            onClick={exportarExcel}
          >
            Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportStockMonth;