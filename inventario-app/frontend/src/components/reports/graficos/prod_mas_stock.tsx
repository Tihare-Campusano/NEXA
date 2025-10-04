import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import ApexCharts from "apexcharts";

type Product = {
    name: string;
    stock: number;
};

export default function StockChart() {
    const [products, setProducts] = useState<Product[]>([]);

    // Función para obtener los datos desde FastAPI
    async function loadData() {
        try {
            const res = await fetch(
                `${process.env.REACT_APP_API_URL}/analytics/top_products?limit=5`
            );
            if (!res.ok) {
                throw new Error("Error al obtener datos del backend");
            }
            const json = await res.json();
            setProducts(json);
        } catch (err) {
            console.error("Error cargando productos:", err);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    const series = [
        {
            name: "Stock",
            data: products.map((p) => p.stock),
        },
    ];

    const options: ApexCharts.ApexOptions = {
        chart: {
            type: 'bar', // <-- Literal 'bar', no string genérico
            toolbar: { show: true },
            animations: { enabled: true }
        },
        xaxis: {
            categories: products.map((p) => p.name),
            title: { text: "Productos" }
        },
        yaxis: {
            title: { text: "Stock disponible" }
        },
        title: {
            text: "Top 5 productos con más stock",
            align: "center"
        },
        plotOptions: {
            bar: { borderRadius: 8, horizontal: false }
        },
        dataLabels: { enabled: true },
    };

    return (
        <div>
            <ReactApexChart
                options={options}
                series={series}
                type="bar" 
                height={350}
            />
        </div>
    );
}