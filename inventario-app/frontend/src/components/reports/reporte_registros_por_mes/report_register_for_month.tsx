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
import "./report_register_for_month.css";

interface ReportRegisterForMonthProps {
  onDidDismiss: () => void;
}

const ReportRegisterForMonth: React.FC<ReportRegisterForMonthProps> = ({
  onDidDismiss,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // 🔹 Función para solicitar permisos de almacenamiento en Android
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

  // 🔹 Obtener datos del mes actual
  const getReportData = async () => {
    const date = new Date();
    const primerDia = new Date(date.getFullYear(), date.getMonth(), 1);
    const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const nombreMes = date.toLocaleString("es-ES", {
      month: "long",
      year: "numeric",
    });
    const mes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    const { data, error } = await supabase
      .from("productos")
      .select("id, sku, nombre, marca, created_at")
      .gte("created_at", primerDia.toISOString())
      .lte("created_at", ultimoDia.toISOString());

    if (error) {
      console.error("❌ Error al obtener productos:", error.message);
      throw error;
    }

    const productos = (data ?? []).map((p: any) => ({
      codigo: p.sku,
      nombre: p.nombre,
      marca: p.marca || "General",
      fecha: new Date(p.created_at).toLocaleDateString("es-CL"),
    }));

    return { productos, mes };
  };

  // 🔹 Guardar archivo en Descargas (público)
  const guardarEnDispositivo = async (fileName: string, base64Data: string) => {
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.External, // Carpeta Descargas
        encoding: undefined,
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
      doc.text(`🗓️ Reporte de Registros (${mes})`, 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Marca", "Fecha de Registro"]],
        body: productos.map((p) => [p.codigo, p.nombre, p.marca, p.fecha]),
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      doc.text(
        `Este reporte corresponde a los productos registrados durante ${mes}.`,
        14,
        finalY + 10
      );

      const base64Data = doc.output("datauristring").split(",")[1];
      const timestamp = new Date().getTime();
      await guardarEnDispositivo(
        `reporte_registros_${mes}_${timestamp}.pdf`,
        base64Data
      );
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
      XLSX.utils.book_append_sheet(wb, ws, `Registros ${mes}`);

      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const timestamp = new Date().getTime();
      await guardarEnDispositivo(
        `reporte_registros_${mes}_${timestamp}.xlsx`,
        base64Data
      );
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
          <IonTitle>Registros del Mes</IonTitle>
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

export default ReportRegisterForMonth;