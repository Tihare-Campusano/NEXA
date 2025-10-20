import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from "@ionic/react";
import "./report_new_product.css";
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

const ReportNewProduct: React.FC = () => {
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
        .eq("estado", "Nuevo"); // 👈 Solo productos "Nuevos"

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

  // Exportar PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Productos Nuevos", 14, 15);

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
      `Este reporte muestra todos los productos clasificados como "Nuevos".
Se recomienda usar primero los usados y luego los nuevos.`,
      14,
      finalY + 10
    );

    doc.save("reporte_productos_nuevos.pdf");
  };

  // Exportar Excel
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(productos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos Nuevos");
    XLSX.writeFile(wb, "reporte_productos_nuevos.xlsx");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reporte de Productos Nuevos</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="reporte-container">
          <h1>🆕 Reporte de Productos Nuevos</h1>
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
              Este reporte lista todos los productos clasificados como{" "}
              <b>"Nuevos"</b>. La recomendación es <b>usar primero los usados</b>{" "}
              y luego los nuevos.
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

export default ReportNewProduct;
