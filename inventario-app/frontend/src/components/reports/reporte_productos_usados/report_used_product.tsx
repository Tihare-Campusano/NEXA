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

import "./report_used_product.css";

/* ============================================================
   📌 Interfaces
   ============================================================ */
interface Producto {
  codigo: string;
  nombre: string;
  marca: string;
  cantidad: number;
  fecha: string;
}

interface Props {
  onDidDismiss: () => void;
}

/* ============================================================
   📌 Componente principal
   ============================================================ */
const ReportUsedProduct: React.FC<Props> = ({ onDidDismiss }) => {
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const notify = async (msg: string) => {
    await Toast.show({ text: msg });
  };

  /* ============================================================
     📌 Solicitar permiso de almacenamiento (Android)
     ============================================================ */
  const solicitarPermiso = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const status = await Filesystem.requestPermissions();

        if (status.publicStorage !== "granted") {
          notify("Debes otorgar permiso de almacenamiento para continuar.");
          return false;
        }
      } catch (err) {
        console.error(err);
        notify("Error solicitando permisos.");
        return false;
      }
    }
    return true;
  };

  /* ============================================================
     📌 Obtener productos USADOS desde Supabase
     ============================================================ */
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select("id, nombre, marca, stock, created_at, estado")
      .in("estado", ["usado", "Usado"]);

    if (error) {
      console.error("ERROR SUPABASE:", error);
      throw error;
    }

    return (data ?? []).map((p: any) => ({
      codigo: p.id?.toString() ?? "",
      nombre: p.nombre ?? "",
      marca: p.marca ?? "General",
      cantidad: p.stock ?? 0,
      fecha: p.created_at
        ? new Date(p.created_at).toLocaleDateString("es-CL")
        : "Sin fecha",
    }));
  };

  /* ============================================================
     📌 Guardar archivo PDF/Excel en Android o Web
     ============================================================ */
  const guardarArchivo = async (
    filename: string,
    base64Data: string,
    mime: string
  ) => {
    const isAndroid = Capacitor.getPlatform() === "android";

    if (isAndroid) {
      try {
        const saved = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });

        const fileUri = Capacitor.convertFileSrc(saved.uri);

        try {
          await FileOpener.open({ filePath: fileUri, contentType: mime });
        } catch {
          notify("Archivo guardado en Documentos.");
        }
      } catch (err) {
        console.error(err);
        notify("Error guardando archivo.");
      }
    } else {
      const link = document.createElement("a");
      link.href = `data:${mime};base64,${base64Data}`;
      link.download = filename;
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
      doc.text("Reporte de Productos Usados", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Marca", "Cantidad", "Fecha"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.marca,
          p.cantidad.toString(),
          p.fecha,
        ]),
      });

      const base64 = doc.output("datauristring").split(",")[1];
      const stamp = Date.now();

      await guardarArchivo(
        `reporte_usados_${stamp}.pdf`,
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

      const datos = productos.map((p) => ({
        Código: p.codigo,
        Nombre: p.nombre,
        Marca: p.marca,
        Cantidad: p.cantidad,
        Fecha: p.fecha,
      }));

      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Usados");

      const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const stamp = Date.now();

      await guardarArchivo(
        `reporte_usados_${stamp}.xlsx`,
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
          <IonTitle>Productos Usados</IonTitle>
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
          <p style={{ textAlign: "center", color: "#666" }}>
            Guarda en PDF o Excel directamente en tu dispositivo.
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

export default ReportUsedProduct;