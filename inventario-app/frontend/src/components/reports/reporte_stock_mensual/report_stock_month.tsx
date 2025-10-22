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
import "./report_stock_month.css"; // 👈 CSS para los botones

// Interface para el tipo de producto
interface Producto {
  codigo: string;
  nombre: string;
  cantidad: number;
  estado: string;
  categoria: string;
}

// Props que el componente recibirá
interface ReportStockMonthProps {
  onDidDismiss: () => void;
}

const ReportStockMonth: React.FC<ReportStockMonthProps> = ({ onDidDismiss }) => {
  const [isLoading, setIsLoading] = useState(false);

  // 1. Lógica para OBTENER los datos (se llama al hacer clic)
  const getReportData = async () => {
    // Calcular nombre del mes
    const date = new Date();
    const nombreMes = date.toLocaleString("es-ES", {
      month: "long",
      year: "numeric",
    });
    const mes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    // 👇 CORREGIDO: 'estado' se saca de 'productos', no de 'stock'
    const { data, error } = await supabase
      .from("productos")
      .select("sku, nombre, marca, estado, stock(cantidad)"); // 👈 CORREGIDO

    if (error) {
      console.error("❌ Error al obtener productos:", error.message);
      throw error;
    }

    const mapped = data.map((p: any) => ({
      codigo: p.sku,
      nombre: p.nombre,
      cantidad: p.stock?.cantidad || 0,
      estado: p.estado || "desconocido", // 👈 CORREGIDO (se usa p.estado)
      categoria: p.marca || "general",
    }));

    // ordenar por stock ascendente (menor primero)
    const ordenados = mapped.sort((a, b) => a.cantidad - b.cantidad);

    return { productos: ordenados, mes };
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
      doc.text(`📊 Reporte de Stock Mensual (${mes})`, 14, 15);

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
        `Este reporte corresponde al mes de ${mes}.
Los productos con menor stock aparecen arriba.`,
        14,
        finalY + 10
      );

      const base64Data = doc.output("datauristring").split(",")[1];
      await guardarEnDispositivo(`reporte_stock_${mes}.pdf`, base64Data);

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
      XLSX.utils.book_append_sheet(wb, ws, `Stock ${mes}`);

      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      await guardarEnDispositivo(`reporte_stock_${mes}.xlsx`, base64Data);

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
          <IonTitle>Reporte de Stock</IonTitle>
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

export default ReportStockMonth;