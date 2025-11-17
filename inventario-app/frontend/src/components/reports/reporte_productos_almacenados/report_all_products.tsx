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
    await Toast.show({ text: mensaje, duration: "long" });
  };

  // Pedir permisos en Android
  const solicitarPermisoDescarga = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const request = await Filesystem.requestPermissions();
        if (request.publicStorage !== "granted") {
          mostrarNotificacion("Por favor, concede permiso de almacenamiento.");
          return false;
        }
      } catch (err) {
        console.error("Error permisos:", err);
        mostrarNotificacion("Error al solicitar permisos.");
        return false;
      }
    }
    return true;
  };

  // 🔹 Obtener TODOS los productos reales de tu BD
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select(`
        id,
        estado,
        disponibilidad,
        stock,
        observaciones,
        imagen_url
      `);

    console.log("PRODUCTOS OBTENIDOS:", data);

    if (error) {
      console.error("Error al obtener productos:", error.message);
      throw error;
    }

    // Transformar datos para el reporte
    return (data ?? []).map((p: any) => ({
      codigo: p.id ?? "",
      nombre: p.observaciones ?? "Sin nombre",
      cantidad: p.stock ?? 0,
      estado: p.estado ?? "Sin estado",
      categoria: p.disponibilidad ?? "General",
    }));
  };

  // Guardar archivo en el dispositivo
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

      const fileUri = savedFile.uri;

      try {
        await FileOpener.open({ filePath: fileUri, contentType: mimeType });
      } catch (err) {
        console.error("Error al abrir archivo:", err);
        mostrarNotificacion("Archivo guardado en Documentos.");
      }
    } catch (err) {
      console.error("Error al guardar archivo:", err);
      mostrarNotificacion("Error al guardar archivo. Verifica permisos.");
    }
  };

  // Exportar PDF
  const exportarPDF = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    mostrarNotificacion("Generando PDF...");

    try {
      const productos = await fetchProductos();
      const doc = new jsPDF();
      doc.text("Reporte de Productos", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Stock", "Estado", "Categoría"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.cantidad.toString(),
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

      mostrarNotificacion("PDF descargado en Documentos.");
    } catch (error) {
      console.error("Error PDF:", error);
      mostrarNotificacion("No se pudo generar el PDF.");
    }
  };

  // Exportar Excel
  const exportarExcel = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    mostrarNotificacion("Generando Excel...");

    try {
      const productos = await fetchProductos();

      const datosExcel = productos.map((p) => ({
        Código: p.codigo,
        Nombre: p.nombre,
        Stock: p.cantidad,
        Estado: p.estado,
        Categoría: p.categoria,
      }));

      const ws = XLSX.utils.json_to_sheet(datosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos");

      const base64Data = XLSX.write(wb, {
        bookType: "xlsx",
        type: "base64",
      });

      const timestamp = new Date().getTime();

      await guardarEnDispositivo(
        `reporte_productos_${timestamp}.xlsx`,
        base64Data,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      mostrarNotificacion("Excel descargado en Documentos.");
    } catch (error) {
      console.error("Error Excel:", error);
      mostrarNotificacion("No se pudo generar el Excel.");
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
          <h3 style={{ textAlign: "center", fontWeight: "bold", marginTop: "1rem" }}>
            ¿Deseas descargar en formato PDF o Excel?
          </h3>
          <p style={{ textAlign: "center", color: "#666" }}>
            Los archivos se guardarán en la carpeta <b>Documentos</b>.
          </p>
        </IonText>

        <div style={{ padding: 20 }}>
          <IonButton color="danger" expand="block" onClick={exportarPDF} style={{ marginBottom: 12 }}>
            Descargar PDF
          </IonButton>

          <IonButton color="success" expand="block" onClick={exportarExcel}>
            Descargar Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportAllProducts;
