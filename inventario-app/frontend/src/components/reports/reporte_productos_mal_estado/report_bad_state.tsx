import React, { useState } from "react";
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
import "./report_bad_state.css";

interface Producto {
  codigo: string;
  nombre: string;
  cantidad: number;
  estado: string;
  categoria: string;
}

interface ReportBadStateProps {
  onDidDismiss: () => void;
}

const ReportBadState: React.FC<ReportBadStateProps> = ({ onDidDismiss }) => {
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const mostrarNotificacion = async (mensaje: string) => {
    await Toast.show({ text: mensaje, duration: "long" });
  };

  const solicitarPermisoDescarga = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const r = await Filesystem.requestPermissions();
        if (r.publicStorage !== "granted") {
          mostrarNotificacion("Se requiere permiso de almacenamiento.");
          return false;
        }
      } catch (err) {
        console.error("Error permisos:", err);
        mostrarNotificacion("No se pudo obtener el permiso.");
        return false;
      }
    }
    return true;
  };

  // 🔹 CORREGIDO según tu estructura real de productos
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select(`
        id,
        observaciones,
        estado,
        stock,
        disponibilidad
      `)
      .eq("estado", "Mal estado");

    if (error) {
      console.error("Error al obtener productos:", error.message);
      throw error;
    }

    console.log("PRODUCTOS MAL ESTADO:", data);

    return (data ?? []).map((p: any) => ({
      codigo: p.id ?? "",
      nombre: p.observaciones ?? "Sin descripción",
      cantidad: p.stock ?? 0,
      estado: p.estado ?? "",
      categoria: p.disponibilidad ?? "General",
    }));
  };

  const guardarEnDispositivo = async (
    fileName: string,
    base64Data: string,
    mimeType: string
  ) => {
    try {
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      try {
        await FileOpener.open({
          filePath: savedFile.uri,
          contentType: mimeType,
        });
      } catch {
        mostrarNotificacion("Archivo guardado en Documentos.");
      }
    } catch (e) {
      console.error("Error al guardar archivo", e);
      mostrarNotificacion("Error al guardar archivo.");
    }
  };

  const exportarPDF = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    mostrarNotificacion("Generando PDF...");

    try {
      const productos = await fetchProductos();

      const doc = new jsPDF();
      doc.text("Reporte de Productos en Mal Estado", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Descripción", "Cantidad", "Estado", "Categoría"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.cantidad.toString(),
          p.estado,
          p.categoria,
        ]),
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      doc.text(
        'Este reporte muestra todos los productos con estado "Mal estado".',
        14,
        finalY + 10
      );

      const base64Data = doc.output("datauristring").split(",")[1];
      const timestamp = new Date().getTime();

      await guardarEnDispositivo(
        `reporte_mal_estado_${timestamp}.pdf`,
        base64Data,
        "application/pdf"
      );

      mostrarNotificacion("PDF descargado correctamente.");
    } catch (error) {
      console.error("Error PDF:", error);
      mostrarNotificacion("No se pudo generar el PDF.");
    }
  };

  const exportarExcel = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    mostrarNotificacion("Generando Excel...");

    try {
      const productos = await fetchProductos();

      const datosExcel = productos.map((p) => ({
        Código: p.codigo,
        Descripción: p.nombre,
        Cantidad: Number(p.cantidad),
        Estado: p.estado,
        Categoría: p.categoria,
      }));

      const ws = XLSX.utils.json_to_sheet(datosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos Mal Estado");

      const base64Data = XLSX.write(wb, {
        bookType: "xlsx",
        type: "base64",
      });

      const timestamp = new Date().getTime();
      await guardarEnDispositivo(
        `reporte_mal_estado_${timestamp}.xlsx`,
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
      {alertMessage && (
        <div className="alert-modal">
          <p>{alertMessage}</p>
          <IonButton onClick={() => setAlertMessage(null)}>Aceptar</IonButton>
        </div>
      )}

      <IonHeader>
        <IonToolbar>
          <IonTitle>Productos Mal Estado</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText>
          <h3 style={{ textAlign: "center", fontWeight: "bold" }}>
            ¿Deseas descargar el reporte?
          </h3>
          <p style={{ textAlign: "center", fontSize: "0.9rem", color: "#666" }}>
            Los archivos se guardarán en la carpeta Documentos.
          </p>
        </IonText>

        <div className="modal-buttons-container">
          <IonButton expand="block" color="danger" onClick={exportarPDF}>
            Descargar PDF
          </IonButton>
          <IonButton expand="block" color="success" onClick={exportarExcel}>
            Descargar Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportBadState;