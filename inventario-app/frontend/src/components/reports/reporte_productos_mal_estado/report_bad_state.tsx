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
import "./report_bad_state.css"; // 👈 CSS para los botones

// Interface para el tipo de producto
interface Producto {
  codigo: string;
  nombre: string;
  cantidad: number;
  estado: string;
  categoria: string;
}

// Props que el componente recibirá (una función para cerrarse)
interface ReportBadStateProps {
  onDidDismiss: () => void;
}

const ReportBadState: React.FC<ReportBadStateProps> = ({ onDidDismiss }) => {
  const [isLoading, setIsLoading] = useState(false);

  // 1. Lógica para OBTENER los datos
  const fetchProductos = async (): Promise<Producto[]> => {
    // 👇 CORREGIDO: Usamos stock(cantidad) y filtramos por 'Mal estado'
    const { data, error } = await supabase
      .from("productos")
      .select("sku, nombre, estado, marca, stock:stock(cantidad)") // 👈 CORREGIDO
      .eq("estado", "Mal estado"); // 👈 Filtro específico de este reporte

    if (error) {
      console.error("Error al obtener productos:", error.message);
      throw error;
    }

    if (data) {
      return data.map((p: any) => ({
        codigo: p.sku,
        nombre: p.nombre,
        cantidad: p.stock?.cantidad || 0, // 👈 CORREGIDO
        estado: p.estado || "Desconocido",
        categoria: p.marca || "General",
      }));
    }
    return [];
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
      const productos = await fetchProductos();
      const doc = new jsPDF();
      doc.text("Reporte de Productos en Mal Estado", 14, 15);

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

      // Añadimos el texto extra (como en tu código original)
      const finalY = (doc as any).lastAutoTable?.finalY || 30;
      doc.text(
        `Este reporte muestra los productos en "Mal estado".
Se recomienda desecharlos ya que no están en buen uso.`,
        14,
        finalY + 10
      );

      const base64Data = doc.output("datauristring").split(",")[1];
      await guardarEnDispositivo("reporte_productos_mal_estado.pdf", base64Data);

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
      const productos = await fetchProductos();
      const ws = XLSX.utils.json_to_sheet(productos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Productos Mal Estado");

      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      await guardarEnDispositivo(
        "reporte_productos_mal_estado.xlsx",
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
          <IonTitle>Productos en Mal Estado</IonTitle>
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

export default ReportBadState;