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

import { getSupabase } from "../../../../../backend/app/services/supabase_service";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { Capacitor } from "@capacitor/core";
import { Toast } from "@capacitor/toast";

import { descargarAndroid } from "../../../plugins/downloadPlugin";

import "./report_register_for_month.css";

/* ============================================================
   📌 Interfaces
============================================================ */
interface ProductoStock {
  codigo: string;
  nombre: string;
  cantidad: number;
  estado: string;
  categoria: string;
}

interface Props {
  onDidDismiss: () => void;
}

/* ============================================================
   📌 Componente Principal
============================================================ */
const ReportStockMonth: React.FC<Props> = ({ onDidDismiss }) => {
  const [alerta, setAlerta] = useState<string | null>(null);

  const notificar = async (msg: string) => {
    await Toast.show({ text: msg });
  };

  /* ============================================================
     📥 Obtener STOCK ordenado ASC
============================================================ */
  const obtenerStock = async (): Promise<ProductoStock[]> => {
    const { data, error } = await getSupabase()
      .from("productos")
      .select("id, nombre, marca, estado, stock");

    if (error) throw error;

    const productos = (data ?? []).map((p: any) => ({
      codigo: p.id?.toString() ?? "",
      nombre: p.nombre ?? "",
      cantidad: p.stock ?? 0,
      estado: p.estado ?? "Desconocido",
      categoria: p.marca ?? "General",
    }));

    return productos.sort((a, b) => a.cantidad - b.cantidad);
  };

  /* ============================================================
     💾 Guardar archivo según plataforma
============================================================ */
  const guardarArchivo = async (
    filename: string,
    base64Data: string,
    mimeType: string
  ) => {
    const platform = Capacitor.getPlatform();

    // 🌐 WEB
    if (platform === "web") {
      const link = document.createElement("a");
      link.href = `data:${mimeType};base64,${base64Data}`;
      link.download = filename;
      link.click();
      return;
    }

    // 🤖 ANDROID — descarga real
    await descargarAndroid(filename, base64Data, mimeType);
  };

  /* ============================================================
     📄 Exportar PDF
============================================================ */
  const exportarPDF = async () => {
    notificar("Generando PDF...");

    try {
      const productos = await obtenerStock();

      const fecha = new Date();
      const mesActual = fecha.toLocaleString("es-ES", {
        month: "long",
        year: "numeric",
      });

      const doc = new jsPDF();
      doc.text(`Reporte de Stock Mensual (${mesActual})`, 14, 15);

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

      const base64 = doc.output("datauristring").split(",")[1];
      const timestamp = Date.now();

      await guardarArchivo(
        `stock_mensual_${timestamp}.pdf`,
        base64,
        "application/pdf"
      );

      notificar("PDF generado correctamente 🎉");
    } catch (err) {
      console.error(err);
      notificar("Error al generar PDF.");
    }
  };

  /* ============================================================
     📊 Exportar Excel
============================================================ */
  const exportarExcel = async () => {
    notificar("Generando Excel...");

    try {
      const productos = await obtenerStock();

      const datos = productos.map((p) => ({
        Código: p.codigo,
        Nombre: p.nombre,
        Cantidad: p.cantidad,
        Estado: p.estado,
        Categoría: p.categoria,
      }));

      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock");

      const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const timestamp = Date.now();

      await guardarArchivo(
        `stock_mensual_${timestamp}.xlsx`,
        base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      notificar("Excel generado correctamente 🎉");
    } catch (err) {
      console.error(err);
      notificar("Error al generar Excel.");
    }
  };

  /* ============================================================
     🎨 Render
============================================================ */
  return (
    <>
      {alerta && (
        <div className="alert-overlay">
          <p>{alerta}</p>
          <IonButton onClick={() => setAlerta(null)}>Aceptar</IonButton>
        </div>
      )}

      <IonHeader>
        <IonToolbar>
          <IonTitle>Stock del Mes</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText>
          <h3 style={{ textAlign: "center", fontWeight: "bold" }}>
            Descarga el Stock Mensual
          </h3>
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

export default ReportStockMonth;
