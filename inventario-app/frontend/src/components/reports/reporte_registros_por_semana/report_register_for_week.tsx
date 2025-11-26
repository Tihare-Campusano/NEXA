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

import "./report_register_for_week.css";

/* ==================================================================
   Interfaces
================================================================== */
interface ProductoSemana {
  codigo: string;
  nombre: string;
  marca: string;
  fecha: string;
  semana: number;
  anio: number;
}

interface Props {
  onDidDismiss: () => void;
}

/* ==================================================================
   Obtener semana ISO
================================================================== */
function obtenerSemana(fecha: Date): { semana: number; anio: number } {
  const temp = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = temp.getUTCDay() || 7;

  temp.setUTCDate(temp.getUTCDate() + 4 - dia);

  const inicio = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((temp.getTime() - inicio.getTime()) / 86400000 + 1) / 7);

  return { semana, anio: temp.getUTCFullYear() };
}

/* ==================================================================
   Componente principal
================================================================== */
const ReportRegisterForWeek: React.FC<Props> = ({ onDidDismiss }) => {
  const [alerta, setAlerta] = useState<string | null>(null);

  const notificar = async (msg: string) => {
    await Toast.show({ text: msg });
  };

  /* ============================================================
     📥 Obtener registros desde Supabase
  ============================================================ */
  const obtenerRegistros = async (): Promise<ProductoSemana[]> => {
    const { data, error } = await getSupabase()
      .from("productos")
      .select("id, sku, nombre, marca, created_at");

    if (error) throw error;

    return (data ?? [])
      .map((p: any) => {
        const fechaObj = new Date(p.created_at);
        const { semana, anio } = obtenerSemana(fechaObj);

        return {
          codigo: p.id ?? "",
          nombre: p.nombre ?? "",
          marca: p.marca ?? "General",
          fecha: fechaObj.toLocaleDateString("es-CL"),
          semana,
          anio,
        };
      })
      .sort((a, b) => {
        if (a.anio !== b.anio) return b.anio - a.anio;
        return b.semana - a.semana;
      });
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

    // 🌐 Web
    if (platform === "web") {
      const a = document.createElement("a");
      a.href = `data:${mimeType};base64,${base64Data}`;
      a.download = filename;
      a.click();
      return;
    }

    // 🤖 Android — descarga real
    await descargarAndroid(filename, base64Data, mimeType);
  };

  /* ============================================================
      📄 Exportar PDF
  ============================================================ */
  const exportarPDF = async () => {
    notificar("Generando PDF...");

    try {
      const registros = await obtenerRegistros();

      const doc = new jsPDF();
      doc.text("Reporte de Registros por Semana (Histórico)", 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Año", "Semana", "Código", "Nombre", "Marca", "Fecha"]],
        body: registros.map((r) => [
          r.anio.toString(),
          r.semana.toString(),
          r.codigo,
          r.nombre,
          r.marca,
          r.fecha,
        ]),
      });

      const base64 = doc.output("datauristring").split(",")[1];
      const stamp = Date.now();

      await guardarArchivo(
        `registros_semanales_${stamp}.pdf`,
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
      const registros = await obtenerRegistros();

      const ws = XLSX.utils.json_to_sheet(
        registros.map((r) => ({
          Año: r.anio,
          Semana: r.semana,
          Código: r.codigo,
          Nombre: r.nombre,
          Marca: r.marca,
          Fecha: r.fecha,
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Registros");

      const base64 = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      const stamp = Date.now();

      await guardarArchivo(
        `registros_semanales_${stamp}.xlsx`,
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
     🎨 Render UI
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
          <IonTitle>Registros por Semana</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText>
          <h3 style={{ textAlign: "center", fontWeight: "bold" }}>
            Descarga del Reporte Semanal Histórico
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

export default ReportRegisterForWeek;
