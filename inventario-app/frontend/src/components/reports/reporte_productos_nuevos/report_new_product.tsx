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

import "./report_new_product.css";

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
const ReportNewProduct: React.FC<Props> = ({ onDidDismiss }) => {
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  /* ============================================================
     📌 Mostrar mensaje flotante (Toast)
  ============================================================ */
  const notify = async (msg: string) => {
    await Toast.show({ text: msg, duration: "long" });
  };

  /* ============================================================
     📌 Solicitar permisos de almacenamiento (solo Android)
  ============================================================ */
  const solicitarPermiso = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const status = await Filesystem.requestPermissions();
        if (status.publicStorage !== "granted") {
          notify("Debes otorgar permisos de almacenamiento.");
          return false;
        }
      } catch (err) {
        console.error(err);
        notify("No se pudieron obtener permisos.");
        return false;
      }
    }
    return true;
  };

  /* ============================================================
     📌 Obtener productos NUEVOS desde Supabase
  ============================================================ */
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select(`sku, nombre, marca, stock(cantidad), created_at`)
      .eq("estado", "nuevo");

    if (error) {
      console.error(error);
      throw error;
    }

    return (data ?? []).map((p: any) => ({
      codigo: p.sku ?? "",
      nombre: p.nombre ?? "",
      marca: p.marca ?? "General",
      cantidad: p.stock?.[0]?.cantidad ?? 0,
      fecha: p.created_at
        ? new Date(p.created_at).toLocaleDateString("es-CL")
        : "N/A",
    }));
  };

  /* ============================================================
     📌 Guardar archivo en Android o Web
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
          directory: Directory.Data,
          recursive: true,
        });

        const fileUri = Capacitor.convertFileSrc(saved.uri);

        try {
          await FileOpener.open({
            filePath: fileUri,
            contentType: mime,
          });
        } catch (err) {
          notify("Archivo guardado en Documentos.");
        }
      } catch (err) {
        console.error(err);
        notify("Error guardando archivo.");
      }
    } else {
      // WEB
      const link = document.createElement("a");
      link.href = "data:" + mime + ";base64," + base64Data;
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
      doc.text("Reporte de Productos Nuevos", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Marca", "Cantidad", "Fecha Ingreso"]],
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
        `reporte_nuevos_${stamp}.pdf`,
        base64,
        "application/pdf"
      );

      notify("PDF descargado exitosamente.");
    } catch (err) {
      console.error(err);
      notify("Error al generar PDF.");
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
        "Fecha Ingreso": p.fecha,
      }));

      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Nuevos");

      const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const stamp = Date.now();

      await guardarArchivo(
        `reporte_nuevos_${stamp}.xlsx`,
        base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      notify("Excel generado exitosamente.");
    } catch (err) {
      console.error(err);
      notify("Error al generar Excel.");
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
          <IonTitle>Productos Nuevos</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText>
          <h3 style={{ textAlign: "center", fontWeight: "bold" }}>
            Descargar Reporte
          </h3>
          <p style={{ textAlign: "center", color: "#777" }}>
            Elige el formato para generar tu archivo.
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

export default ReportNewProduct;

