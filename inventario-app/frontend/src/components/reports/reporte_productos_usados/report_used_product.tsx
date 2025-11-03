import React, { useState } from "react";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonText,
  IonLoading,
} from "@ionic/react";
import { supabase } from "../../../supabaseClient";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
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
  const [isLoading, setIsLoading] = useState(false);

  // 🔹 Función para solicitar permiso de almacenamiento en Android
  const solicitarPermisoDescarga = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const check = await Filesystem.checkPermissions();
        if (check.publicStorage !== "granted") {
          const request = await Filesystem.requestPermissions();
          if (request.publicStorage !== "granted") {
            alert(
              "Por favor, concede permiso de almacenamiento para descargar archivos."
            );
            return false;
          }
        }
      } catch (err) {
        console.error("Error al verificar permisos de almacenamiento:", err);
        alert("No se pudo obtener el permiso de almacenamiento.");
        return false;
      }
    }
    return true;
  };

  // 🔹 Obtener productos filtrados por "Usado"
  const fetchProductos = async (): Promise<Producto[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select("sku, nombre, estado, marca, stock!inner(cantidad)")
      .eq("estado", "Usado");

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

  // 🔹 Guardar archivo en Descargas (público)
  const guardarEnDispositivo = async (fileName: string, base64Data: string) => {
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.External, // Descargas
        encoding: undefined, // quita Encoding.BASE64
      });
      alert(`Archivo guardado en Descargas como: ${fileName}`);
    } catch (e) {
      console.error("Error al guardar archivo", e);
      alert("Error al guardar archivo. ¿Otorgaste permisos a la app?");
    }
  };

  // 🔹 Exportar PDF
  const exportarPDF = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    setIsLoading(true);
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

      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      doc.text(
        `Este reporte muestra todos los productos clasificados como "Usados". Se recomienda utilizarlos primero antes que los productos nuevos.`,
        14,
        finalY + 10
      );

      const base64Data = doc.output("datauristring").split(",")[1];
      const timestamp = new Date().getTime();
      await guardarEnDispositivo(
        `reporte_productos_usados_${timestamp}.pdf`,
        base64Data
      );
    } catch (error) {
      console.error("Error PDF:", error);
      alert("No se pudo generar el PDF.");
    }
    setIsLoading(false);
    onDidDismiss();
  };

  // 🔹 Exportar Excel
  const exportarExcel = async () => {
    const permitido = await solicitarPermisoDescarga();
    if (!permitido) return;

    setIsLoading(true);
    try {
      const productos = await fetchProductos();
      const ws = XLSX.utils.json_to_sheet(productos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos Usados");

      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const timestamp = new Date().getTime();
      await guardarEnDispositivo(
        `reporte_productos_usados_${timestamp}.xlsx`,
        base64Data
      );
    } catch (error) {
      console.error("Error Excel:", error);
      alert("No se pudo generar el Excel.");
    }
    setIsLoading(false);
    onDidDismiss();
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
        <IonLoading isOpen={isLoading} message={"Generando reporte..."} />
        <IonText>
          <h3
            style={{
              textAlign: "center",
              fontWeight: "bold",
              marginTop: "1rem",
            }}
          >
            ¿Deseas descargar en formato PDF o Excel?
          </h3>
        </IonText>
        <div className="modal-buttons-container">
          <IonButton
            className="modal-button"
            color="danger"
            expand="block"
            onClick={exportarPDF}
          >
            PDF
          </IonButton>
          <IonButton
            className="modal-button"
            color="success"
            expand="block"
            onClick={exportarExcel}
          >
            Excel
          </IonButton>
        </div>
      </IonContent>
    </>
  );
};

export default ReportUsedProduct;