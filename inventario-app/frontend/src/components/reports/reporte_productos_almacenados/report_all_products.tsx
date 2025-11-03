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

  // 🔹 Mostrar toast de notificación
  const mostrarNotificacion = async (mensaje: string) => {
    await Toast.show({
      text: mensaje,
      duration: "long",
    });
  };

  // 🔹 Función para solicitar permiso
  const solicitarPermisoDescarga = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const request = await Filesystem.requestPermissions();
        if (request.publicStorage !== "granted") {
          mostrarNotificacion(
            "Por favor, concede permiso de almacenamiento para descargar archivos."
          );
          return false;
        }
      } catch (err) {
        console.error("Error al verificar permisos de almacenamiento:", err);
        mostrarNotificacion("No se pudo obtener el permiso de almacenamiento.");
        return false;
      }
    }
    return true;
  };

  // 🔹 Obtener datos de Supabase
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select("sku, nombre, estado, marca, stock!inner(cantidad)");

    if (error) {
      console.error("Error al obtener productos:", error.message);
      throw error;
    }

    return (data ?? []).map((p: any) => ({
      codigo: p.sku,
      nombre: p.nombre,
      cantidad: p.stock[0]?.cantidad ?? 0,
      estado: p.estado || "Desconocido",
      categoria: p.marca || "General",
    }));
  };

  // 🔹 Guardar archivo en dispositivo y abrirlo
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

      // Intentar abrir el archivo automáticamente
      try {
        await FileOpener.open({
          filePath: fileUri,
          contentType: mimeType,
        });
      } catch (e) {
        console.error("Error al abrir archivo automáticamente:", e);
        mostrarNotificacion(
          "Archivo guardado. Búscalo en la carpeta Documentos de tu dispositivo."
        );
      }
    } catch (e) {
      console.error("Error al guardar archivo", e);
      mostrarNotificacion(
        "Error al guardar archivo. ¿Otorgaste permisos a la app?"
      );
    }
  };

  // 🔹 Exportar PDF
  const exportarPDF = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    mostrarNotificacion("Generando PDF, la descarga se iniciará en breve...");

    try {
      const productos = await fetchProductos();
      const doc = new jsPDF();
      doc.text("Reporte de Productos Almacenados", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Cantidad", "Estado", "Categoría"]],
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

      mostrarNotificacion(
        "PDF descargado correctamente. Revisa el panel de notificaciones o la carpeta Documentos."
      );
    } catch (error) {
      console.error("Error PDF:", error);
      mostrarNotificacion("No se pudo generar el PDF.");
    }
  };

  // 🔹 Exportar Excel
  const exportarExcel = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    mostrarNotificacion("Generando Excel, la descarga se iniciará en breve...");

    try {
      const productos = await fetchProductos();
      const datosExcel = productos.map((p) => ({
        Código: p.codigo,
        Nombre: p.nombre,
        Cantidad: p.cantidad,
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

      mostrarNotificacion(
        "Excel descargado correctamente. Revisa el panel de notificaciones o la carpeta Documentos."
      );
    } catch (error) {
      console.error("Error Excel:", error);
      mostrarNotificacion("No se pudo generar el Excel.");
    }
  };

  return (
    <>
      {alertMessage && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10000,
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            maxWidth: "80%",
            textAlign: "center",
          }}
        >
          <p>{alertMessage}</p>
          <IonButton onClick={() => setAlertMessage(null)} expand="block" style={{ marginTop: "10px" }}>
            Aceptar
          </IonButton>
        </div>
      )}
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
          <p style={{ textAlign: "center", fontSize: "0.9rem", color: "#666" }}>
            Los archivos se guardarán en la carpeta <b>Documentos</b> de tu dispositivo.
          </p>
        </IonText>
        <div className="modal-buttons-container" style={{ padding: "20px" }}>
          <IonButton
            className="modal-button"
            color="danger"
            expand="block"
            onClick={exportarPDF}
            style={{ marginBottom: "10px" }}
          >
            Descargar PDF
          </IonButton>
          <IonButton
            className="modal-button"
            color="success"
            expand="block"
            onClick={exportarExcel}
          >
            Descargar Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportAllProducts;