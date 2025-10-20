import { useHistory } from "react-router-dom"; // 👈 1. Importar useHistory
import { FaFileAlt } from "react-icons/fa";
import { IonPage, IonContent } from "@ionic/react";

// Gráficos que se quedan en esta página
import StockChart from "../../components/reports/graficos/prod_mas_stock";
import EstadoProductosChart from "../../components/reports/graficos/porcen_prod_por_estado";

// Componentes del Dropdown y Header
import ReportesDropdown from "../../components/reports/ReportesDropdown";
import HeaderApp from "../../components/header_app";

// 👇 2. El nombre de la función debe ser "Reportes" (como en tu App.tsx)
export default function Reportes() {
  const history = useHistory(); // 👈 3. Obtener el hook de historial

  // 👇 4. Definir las opciones para que usen history.push()
  //    con las rutas que definiste en App.tsx
  const reportOptions = [
    {
      label: "Todos los Productos",
      onClick: () => history.push("/reportes/productos-almacenados"),
    },
    {
      label: "Productos en Mal Estado",
      onClick: () => history.push("/reportes/productos-mal-estado"),
    },
    {
      label: "Productos Nuevos",
      onClick: () => history.push("/reportes/productos-nuevos"),
    },
    {
      label: "Productos Usados",
      onClick: () => history.push("/reportes/productos-usados"),
    },
    {
      label: "Registros por Mes",
      onClick: () => history.push("/reportes/registros-mes"),
    },
    {
      label: "Registros por Semana",
      onClick: () => history.push("/reportes/registros-semana"),
    },
    {
      label: "Stock Mensual",
      onClick: () => history.push("/reportes/stock-mensual"),
    },
  ];

  return (
    <IonPage>
      {/* 🔹 Header reutilizable */}
      <HeaderApp
        title="Reportes"
        icon={<FaFileAlt size={28} className="text-green-400" />}
      />
      <IonContent className="ion-padding">
        {/* 🔹 Botón desplegable */}
        <div
          style={{
            margin: "1rem 0",
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          {/* 👇 5. Pasa las nuevas opciones de navegación al dropdown */}
          <ReportesDropdown options={reportOptions} />
        </div>

        {/* --- Gráficos (Dashboard de Reportes) --- */}
        <StockChart />
        <br />
        <EstadoProductosChart />

        {/* 👈 6. ¡Ya NO necesitamos el IonModal! 
          App.tsx se encarga de mostrar el componente 
          correcto cuando cambias la URL.
        */}
      </IonContent>
    </IonPage>
  );
}