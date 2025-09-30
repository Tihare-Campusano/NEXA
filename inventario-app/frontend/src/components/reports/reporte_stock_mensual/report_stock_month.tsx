import React, { useEffect, useState } from "react";
import "./report_stock_month.css";
import jsPDF from "jspdf";
// @ts-ignore → ignoramos porque no hay tipos oficiales
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

const ReportStockMonth = (): React.ReactElement => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mes, setMes] = useState<string>("");

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
          stock ( cantidad, estado )
        `);

      if (error) {
        console.error("❌ Error al obtener productos:", error.message);
      } else if (data) {
        console.log("✅ Datos recibidos de Supabase:", data);

        const mapped = data.map((p: any) => ({
          codigo: p.sku,
          nombre: p.nombre,
          cantidad: p.stock?.cantidad || 0,
          estado: p.stock?.estado || "desconocido",
          categoria: p.marca || "general",
        }));

        // ordenar por stock ascendente (menor primero)
        const ordenados = mapped.sort((a, b) => a.cantidad - b.cantidad);
        setProductos(ordenados);
      }
    };

    // Obtener mes actual (ej: "Febrero 2025")
    const date = new Date();
    const nombreMes = date.toLocaleString("es-ES", { month: "long", year: "numeric" });
    setMes(nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1));

    fetchProductos();
  }, []);

  // Exportar PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte de Stock Mensual (${mes})`, 14, 15);

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
Los productos con menor stock aparecen arriba para identificar fácilmente cuáles están por agotarse.`,
      14,
      finalY + 10
    );

    doc.save(`reporte_stock_${mes}.pdf`);
  };

  // Exportar Excel
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(productos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Stock ${mes}`);
    XLSX.writeFile(wb, `reporte_stock_${mes}.xlsx`);
  };

  return (
    <div className="reporte-container">
      <h1>📊 Reporte de Stock Mensual</h1>
      <h2>{mes}</h2>
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
          Este reporte muestra el <b>stock mensual</b> de cada producto.  
          Los productos con <b>menor stock</b> se listan primero para facilitar su reposición.
        </p>
      </div>

      <div className="acciones">
        <button onClick={exportarPDF}>Exportar PDF</button>
        <button onClick={exportarExcel}>Exportar Excel</button>
      </div>
    </div>
  );
};

export default ReportStockMonth;

