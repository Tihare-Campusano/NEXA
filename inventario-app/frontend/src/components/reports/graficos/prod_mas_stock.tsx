import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { getSupabase } from "../../../../../backend/app/services/supabase_service";
import type { ApexOptions } from "apexcharts";

type ProductStock = {
    productos: { nombre: string }[];
    cantidad: number;
};

export default function StockChart() {
    const [products, setProducts] = useState<ProductStock[]>([]);

    // Cargar datos desde Supabase
    async function loadData() {
        const { data, error } = await getSupabase()
            .from("stock")
            .select("cantidad, productos(nombre)")
            .order("cantidad", { ascending: false })
            .limit(5);

        if (error) {
            console.error("Error cargando productos:", error.message);
            return;
        }
        setProducts(data || []);
    }

    useEffect(() => {
        loadData();
    }, []);

    // Configuración del gráfico
    const series = [
        {
            name: "Stock",
            data: products.map((p) => p.cantidad),
        },
    ];

    const options: ApexOptions = {
        chart: { type: "bar" as const, toolbar: { show: true } },
        xaxis: {
            categories: products.map((p) => p.productos[0]?.nombre || "Desconocido"),
            title: { text: "Productos" },
        },
        yaxis: { title: { text: "Stock disponible" } },
        title: { text: "Top 5 productos con más stock", align: "center" },
        plotOptions: { bar: { borderRadius: 8, horizontal: false } },
        dataLabels: { enabled: true },
    };

    return (
        <div>
            <ReactApexChart options={options} series={series} type="bar" height={350} />
        </div>
    );
}
