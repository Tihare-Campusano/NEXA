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
import "./report_register_for_week.css"; // 👈 CSS para los botones

// Tipos derivados de datos del backend (inferidos en tiempo de ejecución)

// Props que el componente recibirá
interface ReportRegisterForWeekProps {
  onDidDismiss: () => void;
}

const ReportRegisterForWeek: React.FC<ReportRegisterForWeekProps> = ({
  onDidDismiss,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // 1. Lógica para OBTENER los datos (se llama al hacer clic)
  const getReportData = async () => {
    // Calcular la semana actual (Domingo - Sábado)
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0); // Inicio del domingo

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999); // Fin del sábado

    const inicioISO = inicioSemana.toISOString();
    const finISO = finSemana.toISOString();

    const semana = `Semana del ${inicioSemana.toLocaleDateString(
      "es-ES"
    )} al ${finSemana.toLocaleDateString("es-ES")}`;

    // Buscar datos
    const { data, error } = await supabase
      .from("productos")
      .select("id, sku, nombre, marca, modelo, created_at")
      .gte("created_at", inicioISO)
      .lte("created_at", finISO);

    if (error) {
      console.error("❌ Error al obtener productos:", error.message);
      throw error;
    }

    // Mapear datos
    const productos = data.map((p: any) => ({
      codigo: p.sku,
      nombre: p.nombre,
      marca: p.marca || "N/A",
      modelo: p.modelo || "N/A",
      fecha: new Date(p.created_at).toLocaleDateString("es-ES"),
    }));

    return { productos, semana };
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
      const { productos, semana } = await getReportData();
      const doc = new jsPDF();
      doc.text(`📅 Reporte de registros (${semana})`, 14, 15);

      autoTable(doc, {
        startY: 20,
        head: [["Código", "Nombre", "Marca", "Modelo", "Fecha"]],
        body: productos.map((p) => [
          p.codigo,
          p.nombre,
          p.marca,
          p.modelo,
          p.fecha,
        ]),
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      doc.text(
        `Este reporte muestra los productos registrados durante la semana indicada.`,
        14,
        finalY + 10
      );

      const base64Data = doc.output("datauristring").split(",")[1];
      await guardarEnDispositivo(
        `reporte_registros_semana.pdf`,
        base64Data
      );

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
      const { productos } = await getReportData();
      const ws = XLSX.utils.json_to_sheet(productos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Semana`);

      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      await guardarEnDispositivo(
        `reporte_registros_semana.xlsx`,
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
          <IonTitle>Registros por Semana</IonTitle>
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

export default ReportRegisterForWeek;