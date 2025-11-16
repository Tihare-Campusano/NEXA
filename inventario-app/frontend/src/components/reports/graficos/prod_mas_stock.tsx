import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { getSupabase } from "../../../../../backend/app/services/supabase_service";
import type { ApexOptions } from "apexcharts";

type ProductStock = {
    id: number;
    nombre: string;
    stock: number;
};

export default function StockChart() {
    const [products, setProducts] = useState<ProductStock[]>([]);

    async function loadData() {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from("productos")
            .select("id, nombre, stock")
            .order("stock", { ascending: false }) // ❌ se eliminó nullsLast
            .limit(5);

        if (error) {
            console.error("Error cargando productos:", error.message);
            return;
        }

        if (data) {
            // Convertir null → 0
            const cleanData = data
                .map((p) => ({
                    id: p.id,
                    nombre: p.nombre ?? "Sin nombre",
                    stock: p.stock ?? 0,
                }))
                .sort((a, b) => b.stock - a.stock) // ✔ Ordenar manualmente por si stock era null

                .slice(0, 5); // ✔ garantizar top 5

            setProducts(cleanData);
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

    const options: ApexOptions = {
        chart: {
            type: "bar",
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        xaxis: {
            categories: products.map((_, i) => i + 1), // 1, 2, 3, 4, 5
            title: { text: "Producto (Índice)" },
        },
        yaxis: { title: { text: "Stock disponible" } },
        title: { text: "Top 5 productos con más stock", align: "center" },
        plotOptions: { bar: { borderRadius: 8 } },
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

            {/* Tabla debajo del gráfico */}
            <table 
                style={{ 
                    width: "100%", 
                    marginTop: "20px", 
                    borderCollapse: "collapse" 
                }}
            >
                <thead>
                    <tr style={{ textAlign: "left", fontWeight: "bold" }}>
                        <th style={{ padding: "10px", border: "1px solid #ccc", fontWeight: "bold" }}>Índice</th>
                        <th style={{ padding: "10px", border: "1px solid #ccc", fontWeight: "bold" }}>Nombre del producto</th>
                        <th style={{ padding: "10px", border: "1px solid #ccc", fontWeight: "bold" }}>Stock</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p, i) => (
                        <tr key={p.id}>
                            <td style={{ padding: "10px", border: "1px solid #ccc" }}>{i + 1}</td>
                            <td style={{ padding: "10px", border: "1px solid #ccc" }}>{p.nombre}</td>
                            <td style={{ padding: "10px", border: "1px solid #ccc" }}>{p.stock}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
