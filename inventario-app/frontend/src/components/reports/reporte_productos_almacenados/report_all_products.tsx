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
import "./report_all_products.css"; // CSS para los botones

// Interface para el tipo de producto
interface Producto {
  codigo: string;
  nombre: string;
  cantidad: number;
  estado: string;
  categoria: string;
}

// Props que el componente recibirá (una función para cerrarse)
interface ReportAllProductsProps {
  onDidDismiss: () => void;
}

const ReportAllProducts: React.FC<ReportAllProductsProps> = ({ onDidDismiss }) => {
  const [isLoading, setIsLoading] = useState(false);

  // 1. Lógica para OBTENER los datos
  const fetchProductos = async (): Promise<Producto[]> => {
    // 👇 CORRECCIÓN 1: Se pide 'stock(cantidad)' en lugar de 'stock(stock_actual)'
    const { data, error } = await supabase
      .from("productos")
      .select("sku, nombre, estado, marca, stock:stock(cantidad)"); // 👈 CORREGIDO

    if (error) {
      console.error("Error al obtener productos:", error.message);
      throw error;
    }

    if (data) {
      return data.map((p: any) => ({
        codigo: p.sku,
        nombre: p.nombre,
        // 👇 CORRECCIÓN 2: Se usa 'p.stock.cantidad'
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
        directory: Directory.Documents, // Carpeta 'Documents'
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
      doc.text("Reporte de Productos Almacenados", 14, 15);

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

      // Genera como string base64 (no .save())
      const base64Data = doc.output("datauristring").split(",")[1];
      await guardarEnDispositivo("reporte_productos.pdf", base64Data);

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
      XLSX.utils.book_append_sheet(wb, ws, "Productos");

      // Genera como string base64 (no .writeFile())
      const base64Data = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
      await guardarEnDispositivo("reporte_productos.xlsx", base64Data);

    } catch (error) {
      console.error("Error Excel:", error);
      alert("No se pudo generar el Excel.");
    }
    setIsLoading(false);
    onDidDismiss(); // Cierra el modal
  };

  // 5. RENDER: Esto es lo que se verá dentro del modal
  return (
    <>
      {/* Encabezado del Modal */}
      <IonHeader>
        <IonToolbar>
          <IonTitle>Todos los Productos</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Cancelar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      {/* Contenido del Modal */}
      <IonContent className="ion-padding">
        <IonLoading isOpen={isLoading} message={"Generando reporte..."} />
        <IonText>
          <h3 style={{ textAlign: "center", fontWeight: "bold", marginTop: '1rem' }}>
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

export default ReportAllProducts;