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
  cantidad: number; // ← Stock REAL
}

interface Props {
  onDidDismiss: () => void;
}

/* ============================================================
   📌 COMPONENTE PRINCIPAL
============================================================ */
const ReportBadState: React.FC<Props> = ({ onDidDismiss }) => {
  const notify = async (msg: string) => {
    await Toast.show({ text: msg });
  };

  /* ============================================================
     📌 Permisos Android
  ============================================================ */
  const solicitarPermiso = async (): Promise<boolean> => {
    const platform = Capacitor.getPlatform();

    if (platform === "web" || platform === "ios") return true;

    try {
      const perm: any = await Filesystem.requestPermissions();

      const granted =
        perm?.publicStorage === "granted" ||
        perm?.granted === true ||
        perm?.state === "granted";

      if (!granted) {
        notify("Debes otorgar permiso de almacenamiento.");
        return false;
      }

      return true;
    } catch (err) {
      console.error(err);
      notify("Error solicitando permisos.");
      return false;
    }
  };

  /* ============================================================
     📌 Obtener productos en MAL ESTADO
  ============================================================ */
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select(`
        id,
        sku,
        nombre,
        marca,
        estado,
        stock
      `)
      .in("estado", ["mal estado", "Mal estado"]);

    if (error) {
      console.error(error);
      throw error;
    }

    return (data ?? []).map((p: any) => ({
      codigo: p.id?.toString() ?? p.sku ?? "N/A",
      nombre: p.nombre ?? "Sin nombre",
      estado: p.estado ?? "N/A",
      marca: p.marca ?? "General",
      cantidad: p.stock ?? 0, // ← CORRECCIÓN FINAL (stock real)
    }));
  };

  /* ============================================================
     📌 Guardar archivo en Web / Android
  ============================================================ */
  const guardarArchivo = async (
    fileName: string,
    base64Data: string,
    mime: string
  ) => {
    const platform = Capacitor.getPlatform();

    if (platform === "web") {
      const link = document.createElement("a");
      link.href = `data:${mime};base64,${base64Data}`;
      link.download = fileName;
      link.click();
      return;
    }

    try {
      const saved = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      const finalPath = Capacitor.convertFileSrc(saved.uri);

      try {
        await FileOpener.open({
          filePath: finalPath,
          contentType: mime,
        });
      } catch {
        notify("Archivo guardado en Documentos.");
      }
    } catch (err) {
      console.error(err);
      notify("Error guardando archivo.");
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
      const stamp = Date.now();

      await guardarArchivo(
        `reporte_mal_estado_${stamp}.pdf`,
        base64,
        "application/pdf"
      );

      notify("PDF generado correctamente 🎉");
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
      const stamp = Date.now();

      await guardarArchivo(
        `reporte_mal_estado_${stamp}.xlsx`,
        base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      notify("Excel generado correctamente 🎉");
    } catch (err) {
      console.error(err);
      notify("Error generando Excel.");
    }
  };

  /* ============================================================
     📌 Render
  ============================================================ */
  return (
    <>
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