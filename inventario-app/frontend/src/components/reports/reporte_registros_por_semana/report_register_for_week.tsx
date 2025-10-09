import React, { useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from "@ionic/react";
import "./report_register_for_week.css";
import jsPDF from "jspdf";
// @ts-ignore
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "../../../supabaseClient";

interface Producto {
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  fecha: string;
}

const ReportRegisterForWeek: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [semana, setSemana] = useState<string>("");

  useEffect(() => {
    const fetchProductos = async () => {
      const hoy = new Date();
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - hoy.getDay());
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);

      const inicioISO = inicioSemana.toISOString().split("T")[0];
      const finISO = finSemana.toISOString().split("T")[0];

      setSemana(
        `Semana del ${inicioSemana.toLocaleDateString("es-ES")} al ${finSemana.toLocaleDateString("es-ES")}`
      );

      const { data, error } = await supabase
        .from("productos")
        .select("id, sku, nombre, marca, modelo, created_at")
        .gte("created_at", inicioISO)
        .lte("created_at", finISO);

      if (error) {
        console.error("❌ Error al obtener productos:", error.message);
      } else if (data) {
        const mapped = data.map((p: any) => ({
          codigo: p.sku,
          nombre: p.nombre,
          marca: p.marca || "N/A",
          modelo: p.modelo || "N/A",
          fecha: new Date(p.created_at).toLocaleDateString("es-ES"),
        }));
        setProductos(mapped);
      }
    };

    fetchProductos();
  }, []);

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text(`📅 Reporte de registros semanales (${semana})`, 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["Código", "Nombre", "Marca", "Modelo", "Fecha"]],
      body: productos.map((p) => [p.codigo, p.nombre, p.marca, p.modelo, p.fecha]),
    });
    const finalY = (doc as any).lastAutoTable?.finalY || 30;
    doc.text(
      `Este reporte muestra los productos registrados durante la semana indicada.\nEl histórico permitirá revisar semanas anteriores.`,
      14,
      finalY + 10
    );
    doc.save(`reporte_registros_semana_${semana}.pdf`);
  };

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(productos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Semana`);
    XLSX.writeFile(wb, `reporte_registros_semana_${semana}.xlsx`);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>📅 Registros por semana</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h2>{semana}</h2>

        <table className="tabla-productos">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p, i) => (
              <tr key={i}>
                <td>{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{p.marca}</td>
                <td>{p.modelo}</td>
                <td>{p.fecha}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="resumen">
          <p>
            Este reporte lista los productos registrados en la semana seleccionada.
            Cada semana nueva se agrega al histórico para que siempre tengas acceso
            a los registros anteriores.
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

export default ReportRegisterForWeek;

