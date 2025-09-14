import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./table-products.css";

// 👇 Configura tu cliente de Supabase
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type Producto = {
    id: number;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    sku: string | null;
    activo: boolean;
    stock?: number;
};

export default function ProductosTable() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProductos = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("productos")
                .select("id, nombre, marca, modelo, sku, activo, stock(cantidad)");

            if (error) {
                console.error("Error al cargar productos:", error.message);
            } else {
                const productosConStock = data.map((p: any) => ({
                    ...p,
                    stock: p.stock?.cantidad ?? 0,
                }));
                setProductos(productosConStock);
            }
            setLoading(false);
        };

        fetchProductos();
    }, []);

    if (loading) return <p>Cargando productos...</p>;

    return (
        <div className="tabla-wrapper">
            <h2 className="tabla-header">📦 Lista de Productos</h2>
            <div className="tabla-container">
                <table className="tabla-productos">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Stock</th>
                            <th>Activo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productos.map((prod) => (
                            <tr key={prod.id}>
                                <td>{prod.id}</td>
                                <td>{prod.nombre}</td>
                                <td>{prod.marca ?? "-"}</td>
                                <td>{prod.modelo ?? "-"}</td>
                                <td>{prod.stock}</td>
                                <td>{prod.activo ? "✅" : "❌"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}