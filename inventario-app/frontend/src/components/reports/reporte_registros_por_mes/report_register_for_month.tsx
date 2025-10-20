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

// --- Imports para generar archivos ---
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Filesystem, Directory } from "@capacitor/filesystem";
import "./report_register_for_month.css"; // 👈 CSS para los botones

// Interface para el tipo de producto
interface Producto {
  codigo: string;
  nombre: string;
  marca: string;
  fecha: string;
}

// Props que el componente recibirá
interface ReportRegisterForMonthProps {
  onDidDismiss: () => void;
}

const ReportRegisterForMonth: React.FC<ReportRegisterForMonthProps> = ({
  onDidDismiss,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // 1. Lógica para OBTENER los datos y el mes (se llama al hacer clic)
  const getReportData = async () => {
    const date = new Date();
    const primerDia = new Date(date.getFullYear(), date.getMonth(), 1);
    const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // Calcular nombre del mes
    const nombreMes = date.toLocaleString("es-ES", {
      month: "long",
      year: "numeric",
    });
    const mes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    // Buscar datos
    const { data, error } = await supabase
      .from("productos")
      .select("id, sku, nombre, marca, created_at")
      .gte("created_at", primerDia.toISOString())
      .lte("created_at", ultimoDia.toISOString());

    if (error) {
      console.error("❌ Error al obtener productos:", error.message);
      throw error;
    }

    // Mapear datos
    const productos = data.map((p: any) => ({
      codigo: p.sku,
      nombre: p.nombre,
      marca: p.marca || "General",
      fecha: new Date(p.created_at).toLocaleDateString("es-CL"),
    }));

    return { productos, mes };
  };

  // 2. Lógica para GUARDAR en el dispositivo (Android/iOS)
  const guardarEnDispositivo = async (fileName: string, base64Data: string) => {
    try {
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
      });
      alert(`Archivo guardado en 'Documents' como: ${fileName}`);
    } catch (e) {
      console.error("Error al guardar archivo", e);
      alert("Error al guardar archivo. ¿Otorgaste permisos a la app?");
    }
  };

  // 3. Lógica para EXPORTAR PDF
  const exportarPDF = async () => {
    setIsLoading(true);
    try {
      const { productos, mes } = await getReportData();
      const doc = new jsPDF();
      doc.text(`🗓️ Reporte de Registros (${mes})`, 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Marca", "Fecha de Registro"]],
        body: productos.map((p) => [p.codigo, p.nombre, p.marca, p.fecha]),
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      doc.text(
        `Este reporte corresponde a los productos registrados durante ${mes}.`,
        14,
        finalY + 10
      );

      const base64Data = doc.output("datauristring").split(",")[1];
      await guardarEnDispositivo(`reporte_registros_${mes}.pdf`, base64Data);

    } catch (error) {
      console.error("Error PDF:", error);
      alert("No se pudo generar el PDF.");
    }
    setIsLoading(false);
    onDidDismiss(); // Cierra el modal
  };

  // 4. Lógica para EXPORTAR EXCEL
  const exportarExcel = async () => {
    setIsLoading(true);
    try {
      const { productos, mes } = await getReportData();
      const ws = XLSX.utils.json_to_sheet(productos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Registros ${mes}`);

      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      await guardarEnDispositivo(
        `reporte_registros_${mes}.xlsx`,
        base64Data
      );

    } catch (error) {
      console.error("Error Excel:", error);
      alert("No se pudo generar el Excel.");
    }
    setIsLoading(false);
    onDidDismiss(); // Cierra el modal
  };

  // 5. RENDER: El contenido del modal
  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Registros del Mes</IonTitle>
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

export default ReportRegisterForMonth;