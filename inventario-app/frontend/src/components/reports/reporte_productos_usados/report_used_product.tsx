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
import "./report_used_product.css";

interface Producto {
  codigo: string;
  nombre: string;
  cantidad: number;
  estado: string;
  categoria: string;
}

interface ReportUsedProductProps {
  onDidDismiss: () => void;
}

const ReportUsedProduct: React.FC<ReportUsedProductProps> = ({ onDidDismiss }) => {
  const mostrarNotificacion = async (mensaje: string) => {
    await Toast.show({ text: mensaje, duration: "long" });
  };

  const solicitarPermisoDescarga = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const check = await Filesystem.checkPermissions();
        if (check.publicStorage !== "granted") {
          const request = await Filesystem.requestPermissions();
          if (request.publicStorage !== "granted") {
            mostrarNotificacion("Se requiere permiso de almacenamiento.");
            return false;
          }
        }
      } catch (err) {
        console.error("Error permisos:", err);
        mostrarNotificacion("Error obteniendo permisos");
        return false;
      }
    }
    return true;
  };

  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select(`
        sku,
        nombre,
        estado,
        categoria:categorias(nombre),
        stock:stock(stock_actual)
      `)
      .eq("estado", "Usado");

    if (error) {
      console.error("Error al obtener productos:", error.message);
      throw error;
    }

    return (data ?? []).map((p: any) => ({
      codigo: p.sku,
      nombre: p.nombre,
      cantidad: p.stock?.stock_actual ?? 0,
      estado: p.estado || "Desconocido",
      categoria: p.categoria?.nombre || "Sin categoría",
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

      await FileOpener.open({
        filePath: savedFile.uri,
        contentType: mimeType,
      });
    } catch (e) {
      console.error("Error al guardar archivo", e);
      mostrarNotificacion("Archivo guardado en Documentos");
    }
  };

  const exportarPDF = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;
    mostrarNotificacion("Generando PDF...");

    try {
      const productos = await fetchProductos();
      const doc = new jsPDF();
      doc.text("Reporte de Productos Usados", 14, 15);

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

      const base64Data = doc.output("datauristring").split(",")[1];
      const timestamp = Date.now();

      await guardarEnDispositivo(
        `reporte_productos_usados_${timestamp}.pdf`,
        base64Data,
        "application/pdf"
      );

      mostrarNotificacion("PDF listo ✅");
    } catch (error) {
      console.error("Error PDF:", error);
      mostrarNotificacion("Error al generar PDF ❌");
    }
  };

  const exportarExcel = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;
    mostrarNotificacion("Generando Excel...");

    try {
      const productos = await fetchProductos();
      const ws = XLSX.utils.json_to_sheet(productos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Usados");

      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const timestamp = Date.now();

      await guardarEnDispositivo(
        `reporte_productos_usados_${timestamp}.xlsx`,
        base64Data,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      mostrarNotificacion("Excel listo ✅");
    } catch (error) {
      console.error("Error Excel:", error);
      mostrarNotificacion("Error al generar Excel ❌");
    }
  };

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Productos Usados</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Cancelar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText>
          <h3 style={{ textAlign: "center", fontWeight: "bold", marginTop: "1rem" }}>
            ¿En qué formato deseas descargar el reporte?
          </h3>
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

export default ReportUsedProduct;
