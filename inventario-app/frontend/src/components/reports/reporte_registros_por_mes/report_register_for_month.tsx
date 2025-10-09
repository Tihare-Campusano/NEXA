import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from "@ionic/react";
import "./report_register_for_month.css";
import jsPDF from "jspdf";
// @ts-ignore
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "../../../supabaseClient";

interface Producto {
  codigo: string;
  nombre: string;
  marca: string;
  fecha: string;
}

const ReportRegisterForMonth: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mes, setMes] = useState<string>("");

  useEffect(() => {
    const fetchProductos = async () => {
      const date = new Date();
      const primerDia = new Date(date.getFullYear(), date.getMonth(), 1);
      const ultimoDia = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from("productos")
        .select("id, sku, nombre, marca, created_at")
        .gte("created_at", primerDia.toISOString())
        .lte("created_at", ultimoDia.toISOString());

      if (error) {
        console.error("❌ Error al obtener productos:", error.message);
      } else if (data) {
        const mapped = data.map((p: any) => ({
          codigo: p.sku,
          nombre: p.nombre,
          marca: p.marca || "General",
          fecha: new Date(p.created_at).toLocaleDateString("es-CL"),
        }));
        setProductos(mapped);
      }
    };

    const nombreMes = new Date().toLocaleString("es-ES", {
      month: "long",
      year: "numeric",
    });
    setMes(nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1));

    fetchProductos();
  }, []);

  // Exportar PDF
  const exportarPDF = () => {
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

    doc.save(`reporte_registros_${mes}.pdf`);
  };

  // Exportar Excel
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(productos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Registros ${mes}`);
    XLSX.writeFile(wb, `reporte_registros_${mes}.xlsx`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>🗓️ Reporte de Registros del Mes</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h2>{mes}</h2>

        <table className="tabla-productos">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Marca</th>
              <th>Fecha Registro</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p, i) => (
              <tr key={i}>
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{p.marca}</td>
                <td>{p.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="resumen">
          <p>
            Este reporte muestra todos los <b>productos registrados en {mes}</b>.
            Úsalo para llevar control de los ingresos al inventario mes a mes.
          </p>
        </div>

        <div className="acciones">
          <button onClick={exportarPDF}>Exportar PDF</button>
          <button onClick={exportarExcel}>Exportar Excel</button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ReportRegisterForMonth;

