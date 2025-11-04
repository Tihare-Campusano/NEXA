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
import "./report_bad_state.css";

interface Producto {
  codigo: string;
  nombre: string;
  cantidad: number;
  estado: string;
  categoria: string;
  codigo_barras: string;
}

interface ReportBadStateProps {
  onDidDismiss: () => void;
}

const ReportBadState: React.FC<ReportBadStateProps> = ({ onDidDismiss }) => {
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // 🔹 Mostrar toast
  const mostrarNotificacion = async (mensaje: string) => {
    await Toast.show({ text: mensaje, duration: "long" });
  };

  // 🔹 Solicitar permisos de almacenamiento
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

  // 🔹 Traer productos en "Mal estado" desde Supabase
  const fetchProductos = async (): Promise<Producto[]> => {
    console.log("📡 Consultando productos en mal estado...");

    const { data, error } = await supabase
      .from("productos")
      .select(`
        id,
        nombre,
        estado,
        marca,
        codigo_barras,
        stock(cantidad)
      `)
      .eq("estado", "Mal estado");

    if (error) {
      console.error("❌ Error al obtener productos:", error.message);
      throw error;
    }

    const productosMapeados = (data ?? []).map((p: any) => ({
      codigo: p.id ?? "",
      nombre: p.nombre ?? "",
      cantidad: p.stock?.[0]?.cantidad ?? 0,
      estado: p.estado ?? "Desconocido",
      categoria: p.marca ?? "General",
      codigo_barras: p.codigo_barras ?? "Sin código",
    }));

    console.log("✅ Productos mapeados:", productosMapeados);

    return productosMapeados;
  };

  // 🔹 Guardar archivo en dispositivo
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
      } catch (e) {
        console.error("⚠️ Error al abrir archivo automáticamente:", e);
        mostrarNotificacion(
          "Archivo guardado. Búscalo en la carpeta Documentos de tu dispositivo."
        );
      }
    } catch (e) {
      console.error("❌ Error al guardar archivo", e);
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
      doc.text("Reporte de Productos en Mal Estado", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Cantidad", "Estado", "Categoría", "Código de Barras"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.cantidad.toString(),
          p.estado,
          p.categoria,
          p.codigo_barras,
        ]),
      });

      const base64Data = doc.output("datauristring").split(",")[1];
      const timestamp = new Date().getTime();

      await guardarEnDispositivo(
        `reporte_productos_mal_estado_${timestamp}.pdf`,
        base64Data,
        "application/pdf"
      );

      mostrarNotificacion("PDF descargado correctamente. Revisa la carpeta Documentos.");
    } catch (error) {
      console.error("❌ Error generando PDF:", error);
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
        Cantidad: Number(p.cantidad),
        Estado: p.estado,
        Categoría: p.categoria,
        "Código de Barras": p.codigo_barras,
      }));

      const ws = XLSX.utils.json_to_sheet(datosExcel);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos Mal Estado");

      const base64Data = XLSX.write(wb, {
        bookType: "xlsx",
        type: "base64",
      });

      const timestamp = new Date().getTime();
      await guardarEnDispositivo(
        `reporte_productos_mal_estado_${timestamp}.xlsx`,
        base64Data,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      mostrarNotificacion("Excel descargado correctamente. Revisa la carpeta Documentos.");
    } catch (error) {
      console.error("❌ Error generando Excel:", error);
      mostrarNotificacion("No se pudo generar el Excel.");
    }
  };

  return (
    <>
      {alertMessage && (
        <div className="alert-popup">
          <p>{alertMessage}</p>
          <IonButton onClick={() => setAlertMessage(null)} expand="block">
            Aceptar
          </IonButton>
        </div>
      )}

      <IonHeader>
        <IonToolbar>
          <IonTitle>Productos en Mal Estado</IonTitle>
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
          <p style={{ textAlign: "center", color: "#666", fontSize: "0.9rem" }}>
            Este reporte incluye todos los productos en <b>Mal estado</b>, con su código de barras.
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

export default ReportBadState;