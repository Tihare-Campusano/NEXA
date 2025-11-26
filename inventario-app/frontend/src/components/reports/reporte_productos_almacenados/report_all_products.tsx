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

import "./report_all_products.css";

// ----------------------
// INTERFACES
// ----------------------
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
  // PERMISOS EN ANDROID
  // ----------------------
  const solicitarPermisos = async () => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const permisos = await Filesystem.requestPermissions();

        if (permisos.publicStorage === "denied") {
          await notificar("Debes otorgar permisos de almacenamiento.");
          return false;
        }
      } catch (err) {
        console.log("Error permisos:", err);
        await notificar("No se pudieron solicitar permisos.");
        return false;
      }
    }
    return true;
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
  // GUARDAR ARCHIVO (NATIVO)
  // ----------------------
  const guardarArchivoNativo = async (
    fileName: string,
    base64: string,
    mimeType: string
  ) => {
    try {
      // 1) Escribir archivo en directorio externo de la app
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.External, // app-specific externo
        recursive: true,
      });

      // 2) Obtener URI real del archivo
      const uriResult = await Filesystem.getUri({
        path: fileName,
        directory: Directory.External,
      });

      console.log("URI archivo:", uriResult.uri);

      // 3) Abrir con FileOpener
      await FileOpener.open({
        filePath: uriResult.uri,
        contentType: mimeType,
      });

      await notificar("Archivo generado y abierto correctamente.");
    } catch (err: any) {
      console.log("Error guardando/abriendo archivo:", err);
      await notificar(
        "Error al guardar o abrir el archivo: " +
          (err?.message ?? "revísalo en la consola")
      );
      throw err;
    }
  };

  // ----------------------
  // DESCARGA EN WEB
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

      const fileName = `reporte_productos_${Date.now()}.pdf`;

      if (isWeb) {
        // 👉 En web: descarga normal
        const blob = doc.output("blob") as Blob;
        descargarWeb(fileName, blob);
        return;
      }

      // 👉 En Android/iOS: usar Filesystem + FileOpener
      if (!(await solicitarPermisos())) return;

      const base64 = doc.output("datauristring").split(",")[1];
      await guardarArchivoNativo(fileName, base64, "application/pdf");
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

      const fileName = `reporte_productos_${Date.now()}.xlsx`;

      if (isWeb) {
        // 👉 En web: blob + descarga
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        descargarWeb(fileName, blob);
        return;
      }

      // 👉 En Android/iOS
      if (!(await solicitarPermisos())) return;

      const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });

      await guardarArchivoNativo(
        fileName,
        base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
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

          <IonButton expand="block" color="success" onClick={exportarExcel}>
            Descargar Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportAllProducts;