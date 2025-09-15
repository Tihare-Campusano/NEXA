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
    stock: number;
    estado: string;
    fecha: string;
};

type Props = {
    productos?: Producto[];
};

export default function ProductosTable({ productos: productosProp }: Props) {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (productosProp) {
            setProductos(productosProp);
            setLoading(false);
            return;
        }

        const fetchProductos = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("productos")
                .select(`
          id,
          nombre,
          marca,
          modelo,
          sku,
          activo,
          created_at,
          stock (
            cantidad,
            estado,
            ultima_actualizacion
          )
        `);

            if (error) {
                console.error("Error al cargar productos:", error.message);
            } else {
                const productosConStock = data.map((p: any) => ({
                    id: p.id,
                    nombre: p.nombre,
                    marca: p.marca,
                    modelo: p.modelo,
                    sku: p.sku,
                    activo: p.activo,
                    stock: p.stock?.cantidad ?? 0,
                    estado: p.stock?.estado ?? "N/A",
                    fecha: p.created_at,
                }));
                setProductos(productosConStock);
            }
            setLoading(false);
        };

        fetchProductos();
    }, [productosProp]);

    if (loading) return <p>Cargando productos...</p>;

    return (
        <div className="tabla-wrapper">
            <div className="tabla-card">
                <h2 className="tabla-header">📦 Lista de Productos</h2>
                <div className="tabla-container">
                    <table className="tabla-productos">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Stock</th>
                                <th>Fecha</th>
                                <th>Disponibilidad</th>
                                <th>Estado</th>
                                <th>Activo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map((prod) => (
                                <tr key={prod.id}>
                                    <td>{prod.id}</td>
                                    <td>{prod.nombre}</td>
                                    <td>{prod.stock}</td>
                                    <td>{new Date(prod.fecha).toLocaleDateString()}</td>
                                    <td>{prod.stock > 0 ? "Disponible" : "Agotado"}</td>
                                    <td>{prod.estado}</td>
                                    <td>{prod.activo ? "✅" : "❌"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}