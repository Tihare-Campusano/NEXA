import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from "@ionic/react";
import "./report_bad_state.css";
import jsPDF from "jspdf";
// @ts-ignore
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "../../../supabaseClient";

interface Producto {
  codigo: string;
  nombre: string;
  cantidad: number;
  estado: string;
  categoria: string;
}

const ReportBadState: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);

  useEffect(() => {
    const fetchProductos = async () => {
      const { data, error } = await supabase
        .from("productos")
        .select(`
          id,
          sku,
          nombre,
          marca,
          modelo,
          estado,
          stock:stock(stock_actual)
        `)
        .eq("estado", "Mal estado");

      if (error) {
        console.error("Error al obtener productos:", error.message);
      } else if (data) {
        const mapped = data.map((p: any) => ({
          codigo: p.sku,
          nombre: p.nombre,
          cantidad: p.stock?.stock_actual || 0,
          estado: p.estado || "Desconocido",
          categoria: p.marca || "General",
        }));
        setProductos(mapped);
      }
    };

    fetchProductos();
  }, []);

  const exportarPDF = () => {
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

    const finalY = (doc as any).lastAutoTable?.finalY || 30;
    doc.text(
      `Este reporte muestra los productos en "Mal estado".
Se recomienda desecharlos ya que no están en buen uso.`,
      14,
      finalY + 10
    );

    doc.save("reporte_productos_mal_estado.pdf");
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(productos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos Mal Estado");
    XLSX.writeFile(wb, "reporte_productos_mal_estado.xlsx");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reporte de Productos en Mal Estado</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="reporte-container">
          <h1>⚠️ Reporte de Productos en Mal Estado</h1>
          <table className="tabla-productos">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Categoría</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p, i) => (
                <tr key={i}>
                  <td>{p.codigo}</td>
                  <td>{p.nombre}</td>
                  <td>{p.cantidad}</td>
                  <td>{p.estado}</td>
                  <td>{p.categoria}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="resumen">
            <p>
              Este reporte lista todos los productos en <b>"Mal estado"</b>. Se
              recomienda <b>desecharlos</b> porque no están en buen uso.
            </p>
          </div>

          <div className="acciones">
            <button onClick={exportarPDF}>Exportar PDF</button>
            <button onClick={exportarExcel}>Exportar Excel</button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ReportBadState;


