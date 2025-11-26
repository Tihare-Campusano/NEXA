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

// Plugins Capacitor (corregidos)
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

// ----------------------
// COMPONENTE
// ----------------------
const ReportAllProducts: React.FC<ReportAllProductsProps> = ({ onDidDismiss }) => {
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
          notificar("Debes otorgar permisos de almacenamiento.");
          return false;
        }
      } catch (err) {
        console.log("Error permisos:", err);
        notificar("No se pudieron solicitar permisos.");
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
  // GUARDAR ARCHIVO
  // ----------------------
  const guardarArchivo = async (fileName: string, base64: string, mimeType: string) => {
    try {
      const resultado = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.ExternalStorage, // ✔ Android Download
        recursive: true,
      });

      await FileOpener.open({
        filePath: resultado.uri,
        contentType: mimeType,
      });

      notificar(`Archivo guardado en Descargas: ${fileName}`);
    } catch (err) {
      console.log("Error guardando archivo:", err);
      notificar("Error al guardar o abrir el archivo.");
    }
  };

  // ----------------------
  // EXPORTAR PDF
  // ----------------------
  const exportarPDF = async () => {
    if (!(await solicitarPermisos())) return;
    notificar("Generando PDF...");

    try {
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

      const base64 = doc.output("datauristring").split(",")[1];
      const fileName = `reporte_productos_${Date.now()}.pdf`;

      await guardarArchivo(fileName, base64, "application/pdf");
    } catch (err) {
      console.log("Error PDF:", err);
      notificar("No se pudo generar el PDF.");
    }
  };

  // ----------------------
  // EXPORTAR EXCEL
  // ----------------------
  const exportarExcel = async () => {
    if (!(await solicitarPermisos())) return;
    notificar("Generando Excel...");

    try {
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

      const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const fileName = `reporte_productos_${Date.now()}.xlsx`;

      await guardarArchivo(
        fileName,
        base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    } catch (err) {
      console.log("Error Excel:", err);
      notificar("No se pudo generar el Excel.");
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
