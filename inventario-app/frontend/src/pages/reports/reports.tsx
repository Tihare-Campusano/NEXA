import { FaFileAlt } from "react-icons/fa"; 
import StockChart from "../../components/reports/graficos/prod_mas_stock";
import EstadoProductosChart from "../../components/reports/graficos/porcen_prod_por_estado";

export default function Home() {
  return (
    <div style={{ padding: "1rem" }}>
      <br />
      <h2 className="titulo-centrado">
        <FaFileAlt style={{ marginRight: "0.5rem" }} />
        Reportes
      </h2>
      <br />
      <StockChart />
      <br />
      <EstadoProductosChart />
    </div>
  );
}