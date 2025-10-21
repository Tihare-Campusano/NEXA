import React from "react";
import { Redirect, Route } from "react-router-dom";
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { home, barChart, create, list, person } from "ionicons/icons";

/* Páginas principales */
import Home from "./pages/home/home";
import Reportes from "./pages/reports/reports";
import Registro from "./pages/register-product/register-manual";
import Productos from "./pages/product/mostrar-products";
import EditorProducto from "./pages/product/editor-product";
import Perfil from "./pages/perfil/perfil";
import RegistroPistola from "./pages/register-product/registro_pistola";


/* Componentes de reportes */
import ReportAllProducts from "./components/reports/reporte_productos_almacenados/report_all_products";
import ReportBadState from "./components/reports/reporte_productos_mal_estado/report_bad_state";
import ReportUsedProduct from "./components/reports/reporte_productos_usados/report_used_product";
import ReportNewProduct from "./components/reports/reporte_productos_nuevos/report_new_product";
import ReportStockMonth from "./components/reports/reporte_stock_mensual/report_stock_month";
import ReportRegisterForMonth from "./components/reports/reporte_registros_por_mes/report_register_for_month";
import ReportRegisterForWeek from "./components/reports/reporte_registros_por_semana/report_register_for_week";

/* Ionic setup */
import "@ionic/react/css/core.css";
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";
import "@ionic/react/css/palettes/dark.system.css";
import "./theme/variables.css";

setupIonicReact();

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            {/* Redirección inicial */}
            <Route exact path="/" render={() => <Redirect to="/tabs/home" />} />

            {/* ========== Rutas con Tabs (vista principal) ========== */}
            <Route exact path="/tabs/home" component={Home} />
            <Route exact path="/tabs/reportes" component={Reportes} />
            <Route exact path="/tabs/registro" component={Registro} />
            <Route exact path="/tabs/productos" component={Productos} />
            <Route exact path="/tabs/perfil" component={Perfil} />

            {/* ========== Rutas fuera del TabBar (reportes individuales) ========== */}
            <Route exact path="/reportes/productos-almacenados" component={ReportAllProducts} />
            <Route exact path="/reportes/productos-mal-estado" component={ReportBadState} />
            <Route exact path="/reportes/productos-usados" component={ReportUsedProduct} />
            <Route exact path="/reportes/productos-nuevos" component={ReportNewProduct} />
            <Route exact path="/reportes/stock-mensual" component={ReportStockMonth} />
            <Route exact path="/reportes/registros-mes" component={ReportRegisterForMonth} />
            <Route exact path="/reportes/registros-semana" component={ReportRegisterForWeek} />

            {/* Editor de producto (sin tabs) */}
            <Route exact path="/product/:id" component={EditorProducto} />
            <Route exact path="/registro/pistola" component={RegistroPistola} />

          </IonRouterOutlet>

          {/* ========== TAB BAR INFERIOR ========== */}
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/tabs/home">
              <IonIcon icon={home} />
              <IonLabel>Inicio</IonLabel>
            </IonTabButton>

            <IonTabButton tab="reportes" href="/tabs/reportes">
              <IonIcon icon={barChart} />
              <IonLabel>Reportes</IonLabel>
            </IonTabButton>

            <IonTabButton tab="registro" href="/tabs/registro">
              <IonIcon icon={create} />
              <IonLabel>Registrar</IonLabel>
            </IonTabButton>

            <IonTabButton tab="productos" href="/tabs/productos">
              <IonIcon icon={list} />
              <IonLabel>Productos</IonLabel>
            </IonTabButton>

            <IonTabButton tab="perfil" href="/tabs/perfil">
              <IonIcon icon={person} />
              <IonLabel>Perfil</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;








