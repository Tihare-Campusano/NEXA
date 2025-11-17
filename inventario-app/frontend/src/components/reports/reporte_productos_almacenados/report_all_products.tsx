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

import "./report_all_products.css";

// 🔹 Interfaz del producto
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
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Mostrar notificación
  const mostrarNotificacion = async (mensaje: string) => {
    await Toast.show({ text: mensaje });
  };


  // 🔹 Solicitar permiso
  const solicitarPermisoDescarga = async () => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const permiso = await Filesystem.requestPermissions();
        if (permiso.state !== "granted") {
          mostrarNotificacion("Necesitas otorgar permiso de almacenamiento.");
          return false;
        }
      } catch (e) {
        mostrarNotificacion("Error al solicitar permisos.");
        return false;
      }
    }
    return true;
  };


  // 🔹 Obtener productos
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase.from("productos").select(`
      sku,
      nombre,
      estado,
      marca,
      stock(cantidad)
    `);

    if (error) throw error;

    // Transformar datos para el reporte
    return (data ?? []).map((p: any) => ({
      codigo: p.id ?? "",
      nombre: p.observaciones ?? "Sin nombre",
      cantidad: p.stock ?? 0,
      estado: p.estado ?? "Sin estado",
      categoria: p.disponibilidad ?? "General",
    }));
  };


  // 🔹 Guardar archivo
  const guardarEnDispositivo = async (
    fileName: string,
    base64Data: string,
    mimeType: string
  ) => {
    try {
      const file = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Data, // ★ Reemplazado para Android
      });

      const filePath = Capacitor.convertFileSrc(file.uri);

      try {

        await FileOpener.open({
          filePath,
          contentType: mimeType,
        });
      } catch {
        mostrarNotificacion("Archivo guardado. Revísalo en Archivos → Data.");
      }
    } catch (e) {
      mostrarNotificacion("No se pudo guardar el archivo.");
    }
  };

  // 🔹 PDF
  const exportarPDF = async () => {
    if (!(await solicitarPermisoDescarga())) return;

    try {
      mostrarNotificacion("Generando PDF…");

      const productos = await fetchProductos();

      const doc = new jsPDF();
      doc.text("Reporte de Productos", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Stock", "Estado", "Categoría"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.cantidad,
          p.estado,
          p.categoria,
        ]),
      });

      const base64Data = doc.output("datauristring").split(",")[1];
      const timestamp = new Date().getTime();

      await guardarEnDispositivo(
        `reporte_productos_${timestamp}.pdf`,
        base64Data,
        "application/pdf"
      );


      mostrarNotificacion("PDF listo 🎉");
    } catch (e) {
      mostrarNotificacion("Error al generar PDF.");
    }
  };

  // 🔹 Excel
  const exportarExcel = async () => {
    if (!(await solicitarPermisoDescarga())) return;

    try {
      mostrarNotificacion("Generando Excel…");

      const productos = await fetchProductos();

      const ws = XLSX.utils.json_to_sheet(
        productos.map((p) => ({
          Código: p.codigo,
          Nombre: p.nombre,
          Cantidad: p.cantidad,
          Estado: p.estado,
          Categoría: p.categoria,
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos");

      const base64Data = XLSX.write(wb, {
        bookType: "xlsx",
        type: "base64",
      });


      const timestamp = Date.now();

      await guardarEnDispositivo(
        `reporte_productos_${timestamp}.xlsx`,
        base64Data,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );


      mostrarNotificacion("Excel listo 🎉");
    } catch {
      mostrarNotificacion("Error al generar Excel.");
    }
  };

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
            ¿Deseas descargar en PDF o Excel?
          </h3>
          <p style={{ textAlign: "center" }}>
            Los archivos se guardarán en el almacenamiento interno.
          </p>
        </IonText>

        <div style={{ padding: 20 }}>

          <IonButton expand="block" color="danger" onClick={exportarPDF}>
            Descargar PDF
          </IonButton>
          <IonButton
            expand="block"
            color="success"
            onClick={exportarExcel}
            style={{ marginTop: 10 }}
          >
            Descargar Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportAllProducts;
