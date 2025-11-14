import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { getSupabase } from "../../../../../backend/app/services/supabase_service";
import type { ApexOptions } from "apexcharts";

type EstadoData = {
    estado: string;
    cantidad: number;
};

export default function EstadoProductosChart() {
    const [dataEstados, setDataEstados] = useState<EstadoData[]>([]);

    // Normalizador de estados
    function normalizarEstado(estado: string): string {
        const e = (estado || "").trim().toLowerCase();

        if (e === "nuevo") return "Nuevo";
        if (e === "usado") return "Usado";
        if (e === "mal estado" || e === "malestado" || e === "mal-estado") return "Mal estado";

        return e.charAt(0).toUpperCase() + e.slice(1);
    }

    async function loadData() {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from("productos")
            .select("estado");

        if (error) {
            console.error("Error cargando estados:", error.message);
            return;
        }

        if (data) {
            const agrupados: Record<string, number> = {};

            data.forEach((item: any) => {
                const estadoNormalizado = normalizarEstado(item.estado || "Incierto");
                agrupados[estadoNormalizado] = (agrupados[estadoNormalizado] || 0) + 1;
            });

            const estadosArray = Object.entries(agrupados).map(([estado, cantidad]) => ({
                estado,
                cantidad,
            }));

            setDataEstados(estadosArray);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    const series = dataEstados.map((e) => e.cantidad);
    const labels = dataEstados.map((e) => e.estado);

    const options: ApexOptions = {
        chart: { type: "pie", toolbar: { show: false }, zoom: { enabled: false } },
        labels,
        title: { text: "Distribución de productos por estado", align: "center" },
        legend: { position: "bottom" },
        dataLabels: {
            enabled: true,
            formatter: (val: number) => `${val.toFixed(1)}%`,
        },
    };

    // Tabla explicativa
    const definiciones = [
        { estado: "Nuevo", descripcion: "Objeto sellado / recién comprado." },
        { estado: "Usado", descripcion: "Objeto con uso normal, funciona bien." },
        { estado: "Mal estado", descripcion: "Daños visibles o fallas importantes." },
        { estado: "Incierto", descripcion: "Estado no especificado o desconocido." },
    ];

    return (
        <div style={{ textAlign: "center" }}>
            <ReactApexChart options={options} series={series} type="pie" height={350} />

            {/* TABLA DE ESTADOS */}
            <h3 style={{ marginTop: "25px" }}>Significado de cada estado</h3>

            <table
                style={{
                    margin: "0 auto",
                    width: "80%",
                    borderCollapse: "collapse",
                    marginTop: "10px",
                    fontSize: "14px",
                }}
            >
                <thead>
                    <tr>
                        <th style={{ padding: "10px", border: "1px solid #ccc", fontWeight: "bold" }}>
                            Estado
                        </th>
                        <th style={{ padding: "10px", border: "1px solid #ccc", fontWeight: "bold" }}>
                            Significado
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {definiciones.map((row) => (
                        <tr key={row.estado}>
                            <td style={{ padding: "10px", border: "1px solid #ccc" }}>{row.estado}</td>
                            <td style={{ padding: "10px", border: "1px solid #ccc" }}>{row.descripcion}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
