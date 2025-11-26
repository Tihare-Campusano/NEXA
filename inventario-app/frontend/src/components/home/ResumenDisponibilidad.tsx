import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./resumen-disponibilidad.css";

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

export default function ResumenDisponibilidad() {
    const [conteo, setConteo] = useState({
        sinStock: 0,
        baja: 0,
        media: 0,
        alta: 0,
    });

    const [loading, setLoading] = useState(true);

    const fetchResumen = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("productos")
            .select("disponibilidad");

        if (error) {
            console.error("Error cargando resumen:", error);
            setLoading(false);
            return;
        }

        const resumen = {
            sinStock: 0,
            baja: 0,
            media: 0,
            alta: 0,
        };

        data?.forEach((p: any) => {
            const disp = (p.disponibilidad || "").toLowerCase();

            if (disp.includes("sin stock")) resumen.sinStock++;
            else if (disp.includes("baja disponibilidad")) resumen.baja++;
            else if (disp.includes("disponibilidad media")) resumen.media++;
            else if (disp.includes("alta disponibilidad")) resumen.alta++;
        });

        setConteo(resumen);
        setLoading(false);
    };

    useEffect(() => {
        fetchResumen();
        window.addEventListener("focus", fetchResumen);
        return () => window.removeEventListener("focus", fetchResumen);
    }, []);

    return (
        <div className="resumen-card">
            <h3 className="resumen-title">Resumen por disponibilidad</h3>

            <table className="resumen-table">
                <thead>
                    <tr>
                        <th>Color</th>
                        <th>Significado</th>
                        <th>Cantidad</th>
                    </tr>
                </thead>

                <tbody>
                    <tr>
                        <td><span className="dot red" /></td>
                        <td>Sin stock</td>
                        <td>{conteo.sinStock}</td>
                    </tr>

                    <tr>
                        <td><span className="dot yellow" /></td>
                        <td>Baja disponibilidad</td>
                        <td>{conteo.baja}</td>
                    </tr>

                    <tr>
                        <td><span className="dot blue" /></td>
                        <td>Disponibilidad media</td>
                        <td>{conteo.media}</td>
                    </tr>

                    <tr>
                        <td><span className="dot green" /></td>
                        <td>Alta disponibilidad</td>
                        <td>{conteo.alta}</td>
                    </tr>
                </tbody>
            </table>

            {loading && <p className="resumen-loading">Cargando resumen...</p>}
        </div>
    );
}
