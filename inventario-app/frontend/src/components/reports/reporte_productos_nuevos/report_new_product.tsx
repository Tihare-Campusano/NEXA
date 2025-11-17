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

import "./report_new_product.css";

interface Producto {
  codigo: string;
  nombre: string;
  cantidad: number;
  estado: string;
  categoria: string;
}

interface ReportNewProductProps {
  onDidDismiss: () => void;
}

const ReportNewProduct: React.FC<ReportNewProductProps> = ({
  onDidDismiss,
}) => {
  const mostrarNotificacion = async (mensaje: string) => {
    await Toast.show({ text: mensaje, duration: "long" });
  };

  const solicitarPermisoDescarga = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const permiso = await Filesystem.requestPermissions();
        if (permiso.publicStorage !== "granted") {
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

  // 🔹 Consulta corregida según tus columnas reales
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
      .or("estado.eq.Nuevo,estado.eq.Nuevos"); // acepta "Nuevo" o "Nuevos"

    if (error) {
      console.error("Error al obtener productos:", error.message);
      throw error;
    }

    console.log("PRODUCTOS NUEVOS:", data);

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
      const saved = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      try {
        await FileOpener.open({
          filePath: saved.uri,
          contentType: mimeType,
        });
      } catch {
        mostrarNotificacion("Archivo guardado en Documentos.");
      }
    } catch (error) {
      console.error("Error al guardar archivo", error);
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
      doc.text("Reporte de Productos Nuevos", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Descripción", "Cantidad", "Estado", "Categoría"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.cantidad,
          p.estado,
          p.categoria,
        ]),
      });

      const base64 = doc.output("datauristring").split(",")[1];
      const timestamp = Date.now();

      await guardarEnDispositivo(
        `reporte_productos_nuevos_${timestamp}.pdf`,
        base64,
        "application/pdf"
      );

      mostrarNotificacion("PDF descargado correctamente.");
    } catch (error) {
      console.error("Error PDF:", error);
      mostrarNotificacion("Error al generar PDF.");
    }
  };

  const exportarExcel = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    mostrarNotificacion("Generando Excel...");

    try {
      const productos = await fetchProductos();

      const datos = productos.map((p) => ({
        Código: p.codigo,
        Descripción: p.nombre,
        Cantidad: p.cantidad,
        Estado: p.estado,
        Categoría: p.categoria,
      }));

      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos Nuevos");

      const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const timestamp = Date.now();

      await guardarEnDispositivo(
        `reporte_productos_nuevos_${timestamp}.xlsx`,
        base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      mostrarNotificacion("Excel descargado correctamente.");
    } catch (error) {
      console.error("Error Excel:", error);
      mostrarNotificacion("Error al generar Excel.");
    }
  };

  return (
    <>
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
          <h3
            style={{
              textAlign: "center",
              fontWeight: "bold",
              marginTop: "1rem",
            }}
          >
            ¿Deseas descargar el reporte?
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

export default ReportNewProduct;