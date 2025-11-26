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

import "./report_stock_month.css";

/* ============================================================
   📌 Interface
============================================================ */
interface ProductoStock {
  codigo: string;
  nombre: string;
  cantidad: number;
  marca: string;
  fecha: string;
}

interface Props {
  onDidDismiss: () => void;
}

/* ============================================================
   📌 Componente
============================================================ */
const ReportStockMonth: React.FC<Props> = ({ onDidDismiss }) => {
  const [alerta, setAlerta] = useState<string | null>(null);

  /* Toast */
  const notificar = async (msg: string) => {
    await Toast.show({ text: msg });
  };

  /* ============================================================
     📥 Obtener stock del mes
  ============================================================ */
  const obtenerStockMes = async (): Promise<ProductoStock[]> => {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const { data, error } = await getSupabase()
      .from("productos")
      .select("id, nombre, marca, created_at, stock")
      .gte("created_at", inicioMes.toISOString());

    if (error) throw error;

    return (data ?? []).map((p: any) => ({
      codigo: p.id?.toString() ?? "",
      nombre: p.nombre ?? "",
      marca: p.marca ?? "",
      cantidad: Number(p.stock) ?? 0,
      fecha: p.created_at
        ? new Date(p.created_at).toLocaleDateString("es-CL")
        : "N/A",
    }));
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
    notificar("Generando PDF…");

    try {
      const productos = await obtenerStockMes();

      const doc = new jsPDF();
      doc.text("Reporte de Stock del Mes", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Marca", "Cantidad", "Fecha"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.marca,
          p.cantidad.toString(),
          p.fecha,
        ]),
      });

      const base64 = doc.output("datauristring").split(",")[1];
      const filename = `stock_mes_${Date.now()}.pdf`;

      await guardarArchivo(filename, base64, "application/pdf");

      notificar("PDF generado exitosamente 🎉");
    } catch (err) {
      console.error(err);
      notificar("Error al generar PDF.");
    }
  };

  /* ============================================================
      📊 Exportar Excel
  ============================================================ */
  const exportarExcel = async () => {
    notificar("Generando Excel…");

    try {
      const productos = await obtenerStockMes();

      const datos = productos.map((p) => ({
        Código: p.codigo,
        Nombre: p.nombre,
        Marca: p.marca,
        Cantidad: p.cantidad,
        Fecha: p.fecha,
      }));

      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Mes");

      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      await guardarArchivo(
        `stock_mes_${Date.now()}.xlsx`,
        base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      notificar("Excel generado exitosamente 🎉");
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
          <IonTitle>Stock Mensual</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText>
          <h3 style={{ textAlign: "center", fontWeight: "bold" }}>
            Descargar Stock del Mes
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
