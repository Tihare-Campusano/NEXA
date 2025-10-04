import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { getSupabase } from "../../../../../backend/app/services/supabase_service";
import type { ApexOptions } from "apexcharts";

type Product = {
    name: string;
    stock: number;
};

export default function StockChart() {
    const [products, setProducts] = useState<Product[]>([]);

    // Cargar datos desde Supabase
    async function loadData() {
        const { data, error } = await getSupabase()
            .from("products")
            .select("name, stock")
            .order("stock", { ascending: false })
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
            data: products.map((p) => p.stock),
        },
    ];

    const options: ApexOptions = {
        chart: { type: "bar" as const, toolbar: { show: true } }, 
        xaxis: { categories: products.map((p) => p.name), title: { text: "Productos" } },
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