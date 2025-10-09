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

    async function loadData() {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from("productos")
            .select("estado, count:estado", { count: "exact", head: false });

        if (error) {
            console.error("Error cargando estados:", error.message);
            return;
        }

        if (data) {
            const agrupados: Record<string, number> = {};
            data.forEach((item: any) => {
                agrupados[item.estado] = (agrupados[item.estado] || 0) + 1;
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
        chart: {
            type: "pie",
            toolbar: { show: false }, // 🚫 oculta toolbar
            zoom: { enabled: false }, // 🚫 desactiva zoom para permitir scroll
        },
        labels,
        title: { text: "Distribución de productos por estado", align: "center" },
        legend: { position: "bottom" },
        dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(1)}%` },
    };

    return (
        <div>
            <ReactApexChart options={options} series={series} type="pie" height={350} />
        </div>
    );
}
