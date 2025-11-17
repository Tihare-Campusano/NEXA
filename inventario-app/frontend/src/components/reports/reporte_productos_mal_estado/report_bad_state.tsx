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

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { Toast } from "@capacitor/toast";

import "./report_bad_state.css";

/* ============================================================
   📌 INTERFACES
   ============================================================ */
interface Producto {
  codigo: string;
  nombre: string;
  estado: string;
  marca: string;
  cantidad: number;
}

interface Props {
  onDidDismiss: () => void;
}

/* ============================================================
   📌 COMPONENTE PRINCIPAL
   ============================================================ */
const ReportBadState: React.FC<Props> = ({ onDidDismiss }) => {
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  /* ============================================================
     📌 Toast Notification
     ============================================================ */
  const notify = async (msg: string) => {
    await Toast.show({ text: msg, duration: "long" });
  };

  /* ============================================================
     📌 Solicitar permiso de almacenamiento (solo Android)
     ============================================================ */
  const solicitarPermiso = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const status = await Filesystem.requestPermissions();
        if (status.publicStorage !== "granted") {
          notify("Debes otorgar permiso de almacenamiento.");
          return false;
        }
      } catch (err) {
        console.error(err);
        notify("Error obteniendo permiso.");
        return false;
      }
    }
    return true;
  };

  /* ============================================================
     📌 Obtener productos con estado = 'mal estado'
     ============================================================ */
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select(`
        sku,
        nombre,
        estado,
        marca,
        stock(cantidad)
      `)
      .eq("estado", "mal estado");

    if (error) {
      console.error(error);
      throw error;
    }

    return (data ?? []).map((p: any) => ({
      codigo: p.sku ?? "",
      nombre: p.nombre ?? "",
      estado: p.estado ?? "N/A",
      marca: p.marca ?? "General",
      cantidad: p.stock?.[0]?.cantidad ?? 0,
    }));
  };

  /* ============================================================
     📌 Guardar archivos (Android / Web)
     ============================================================ */
  const guardarArchivo = async (
    fileName: string,
    base64Data: string,
    mime: string
  ) => {
    const isAndroid = Capacitor.getPlatform() === "android";

    if (isAndroid) {
      try {
        const saved = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Data, // ← 100% compatible Android 10–14
          recursive: true,
        });

        const fileUri = Capacitor.convertFileSrc(saved.uri);

        try {
          await FileOpener.open({ filePath: fileUri, contentType: mime });
        } catch (err) {
          notify("Archivo guardado. Revísalo en Documentos.");
        }
      } catch (err) {
        console.error(err);
        notify("Error guardando archivo.");
      }
    } else {
      // WEB
      const link = document.createElement("a");
      link.href = "data:" + mime + ";base64," + base64Data;
      link.download = fileName;
      link.click();
    }
  };

  /* ============================================================
     📌 Exportar PDF
     ============================================================ */
  const exportarPDF = async () => {
    if (!(await solicitarPermiso())) return;

    notify("Generando PDF...");

    try {
      const productos = await fetchProductos();

      const doc = new jsPDF();
      doc.text("Reporte de Productos en Mal Estado", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Estado", "Marca", "Cantidad"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.estado,
          p.marca,
          p.cantidad.toString(),
        ]),
      });

      const base64 = doc.output("datauristring").split(",")[1];
      const stamp = new Date().getTime();

      await guardarArchivo(
        `reporte_mal_estado_${stamp}.pdf`,
        base64,
        "application/pdf"
      );

      notify("PDF generado correctamente.");
    } catch (err) {
      console.error(err);
      notify("Error generando PDF.");
    }
  };

  /* ============================================================
     📌 Exportar Excel
     ============================================================ */
  const exportarExcel = async () => {
    if (!(await solicitarPermiso())) return;

    notify("Generando Excel...");

    try {
      const productos = await fetchProductos();

      const ws = XLSX.utils.json_to_sheet(
        productos.map((p) => ({
          Código: p.codigo,
          Nombre: p.nombre,
          Estado: p.estado,
          Marca: p.marca,
          Cantidad: p.cantidad,
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mal Estado");

      const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const stamp = new Date().getTime();

      await guardarArchivo(
        `reporte_mal_estado_${stamp}.xlsx`,
        base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      notify("Excel generado correctamente.");
    } catch (err) {
      console.error(err);
      notify("Error generando Excel.");
    }
  };

  return (
    <>
      {alertMsg && (
        <div className="alert-overlay">
          <p>{alertMsg}</p>
          <IonButton onClick={() => setAlertMsg(null)}>Aceptar</IonButton>
        </div>
      )}

      <IonHeader>
        <IonToolbar>
          <IonTitle>Reporte de Productos en Mal Estado</IonTitle>
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

          <p style={{ textAlign: "center", color: "#666" }}>
            Los archivos se guardarán en tu dispositivo.
          </p>
        </IonText>

        <div style={{ padding: "16px" }}>
          <IonButton expand="block" color="danger" onClick={exportarPDF}>
            Descargar PDF
          </IonButton>

          <IonButton
            expand="block"
            color="success"
            onClick={exportarExcel}
            style={{ marginTop: "10px" }}
          >
            Descargar Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportBadState;
