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

import { supabase } from "../../../../supabaseClient";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { Toast } from "@capacitor/toast";

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
   Función para obtener número de semana
================================================================== */
function obtenerSemana(fecha: Date): { semana: number; anio: number } {
  const tempDate = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const diaSemana = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - diaSemana);

  const inicioAnio = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const numeroSemana = Math.ceil(((tempDate.getTime() - inicioAnio.getTime()) / 86400000 + 1) / 7);

  return { semana: numeroSemana, anio: tempDate.getUTCFullYear() };
}

/* ==================================================================
   Reporte por semana
================================================================== */
const ReportRegisterForWeek: React.FC<Props> = ({ onDidDismiss }) => {
  const [alerta, setAlerta] = useState<string | null>(null);

  const notificar = async (msg: string) => {
    await Toast.show({ text: msg, duration: "long" });
  };

  /* ============================================================
     🔐 Permisos Android
  ============================================================ */
  const solicitarPermisos = async (): Promise<boolean> => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const perm = await Filesystem.requestPermissions();
        if (perm.publicStorage !== "granted") {
          notificar("Debes conceder permisos de almacenamiento.");
          return false;
        }
      } catch {
        notificar("No se pudo obtener permisos.");
        return false;
      }
    }
    return true;
  };

  /* ============================================================
     📥 Obtener registros desde Supabase
  ============================================================ */
  const obtenerRegistros = async (): Promise<ProductoSemana[]> => {
    const { data, error } = await supabase
      .from("productos")
      .select("sku, nombre, marca, created_at");

    if (error) throw error;

    return (data ?? []).map((p: any) => {
      const fechaObj = new Date(p.created_at);
      const { semana, anio } = obtenerSemana(fechaObj);

      return {
        codigo: p.sku ?? "",
        nombre: p.nombre ?? "",
        marca: p.marca ?? "General",
        fecha: fechaObj.toLocaleDateString("es-CL"),
        semana,
        anio,
      };
    }).sort((a, b) => {
      if (a.anio !== b.anio) return b.anio - a.anio;
      return b.semana - a.semana;
    });
  };

  /* ============================================================
      💾 Guardar archivo (Android / Web)
  ============================================================ */
  const guardarArchivo = async (
    filename: string,
    base64Data: string,
    mimeType: string
  ) => {
    const isAndroid = Capacitor.getPlatform() === "android";

    if (isAndroid) {
      try {
        const saved = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Data,
          recursive: true,
        });

        const fileUri = Capacitor.convertFileSrc(saved.uri);
        try {
          await FileOpener.open({
            filePath: fileUri,
            contentType: mimeType,
          });
        } catch {
          notificar("Archivo guardado. Revisa la carpeta Documentos.");
        }
      } catch (err) {
        notificar("Error al guardar archivo.");
      }
    } else {
      // Web
      const a = document.createElement("a");
      a.href = `data:${mimeType};base64,${base64Data}`;
      a.download = filename;
      a.click();
    }
  };

  /* ============================================================
      📄 Exportar PDF
  ============================================================ */
  const exportarPDF = async () => {
    if (!(await solicitarPermisos())) return;
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
      const timestamp = Date.now();

      await guardarArchivo(
        `registros_semanales_${timestamp}.pdf`,
        base64,
        "application/pdf"
      );

      notificar("PDF generado correctamente.");
    } catch (err) {
      notificar("Error al generar PDF.");
    }
  };

  /* ============================================================
      📊 Exportar Excel
  ============================================================ */
  const exportarExcel = async () => {
    if (!(await solicitarPermisos())) return;
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
      const timestamp = Date.now();

      await guardarArchivo(
        `registros_semanales_${timestamp}.xlsx`,
        base64,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      notificar("Excel generado correctamente.");
    } catch {
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

