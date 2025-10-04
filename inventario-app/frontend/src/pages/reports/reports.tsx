import { FaFileAlt } from "react-icons/fa";
import { IonPage, IonContent } from "@ionic/react";
import StockChart from "../../components/reports/graficos/prod_mas_stock";
import EstadoProductosChart from "../../components/reports/graficos/porcen_prod_por_estado";
import ReportesDropdown from "../../components/reports/ReportesDropdown";

// 👇 ejemplo: aquí podrías abrir tus otros componentes de reportes
function abrirReporte1() {
  console.log("Reporte 1 generado!");
}

function abrirReporte2() {
  console.log("Reporte por Estado generado!");
}

export default function Home() {
  return (
    <IonPage>
      <IonContent className="ion-padding">
        <h2 className="titulo-centrado">
          <FaFileAlt style={{ marginRight: "0.5rem" }} />
          Reportes
        </h2>

        {/* 🔹 Botón desplegable con margen y alineado a la izquierda */}
        <div style={{ margin: "1rem 0", display: "flex", justifyContent: "flex-start" }}>
          <ReportesDropdown
            options={[
              { label: "Reporte de Stock", onClick: abrirReporte1 },
              { label: "Reporte por Estado", onClick: abrirReporte2 },
            ]}
          />
        </div>

        <StockChart />
        <br />
        <EstadoProductosChart />
      </IonContent>
    </IonPage>
  );
}
