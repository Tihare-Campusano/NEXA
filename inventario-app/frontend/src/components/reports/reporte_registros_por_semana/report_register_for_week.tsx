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
import "./report_register_for_week.css";

interface ReportRegisterForWeekProps {
  onDidDismiss: () => void;
}

const ReportRegisterForWeek: React.FC<ReportRegisterForWeekProps> = ({
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

  // 🔹 Obtener datos de la semana actual
  const getReportData = async () => {
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0);

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);

    const inicioISO = inicioSemana.toISOString();
    const finISO = finSemana.toISOString();

    const semana = `Semana del ${inicioSemana.toLocaleDateString(
      "es-ES"
    )} al ${finSemana.toLocaleDateString("es-ES")}`;

    const { data, error } = await supabase
      .from("productos")
      .select("id, sku, nombre, marca, modelo, created_at")
      .gte("created_at", inicioISO)
      .lte("created_at", finISO);

    if (error) {
      console.error("❌ Error al obtener productos:", error.message);
      throw error;
    }

    const productos = (data ?? []).map((p: any) => ({
      codigo: p.sku,
      nombre: p.nombre,
      marca: p.marca || "N/A",
      modelo: p.modelo || "N/A",
      fecha: new Date(p.created_at).toLocaleDateString("es-ES"),
    }));

    return { productos, semana };
  };

  // 🔹 Guardar archivo en Descargas
  const guardarEnDispositivo = async (fileName: string, base64Data: string) => {
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.External, // Carpeta pública
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
      const { productos, semana } = await getReportData();
      const doc = new jsPDF();
      doc.text(`📅 Reporte de registros (${semana})`, 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Marca", "Modelo", "Fecha"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.marca,
          p.modelo,
          p.fecha,
        ]),
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      doc.text(
        `Este reporte muestra los productos registrados durante la semana indicada.`,
        14,
        finalY + 10
      );

      const base64Data = doc.output("datauristring").split(",")[1];
      const timestamp = new Date().getTime();
      await guardarEnDispositivo(
        `reporte_registros_semana_${timestamp}.pdf`,
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
      const { productos, semana } = await getReportData();
      const ws = XLSX.utils.json_to_sheet(productos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Semana`);

      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const timestamp = new Date().getTime();
      await guardarEnDispositivo(
        `reporte_registros_semana_${timestamp}.xlsx`,
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
          <IonTitle>Registros por Semana</IonTitle>
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

export default ReportRegisterForWeek;