import ReportAllProducts from "./components/reports/reporte_productos_almacenados/report_all_products";
import ReportBadState from "./components/reports/reporte_productos_mal_estado/report_bad_state";
import ReportUsedProduct from "./components/reports/reporte_productos_usados/report_used_product";
import ReportNewProduct from "./components/reports/reporte_productos_nuevos/report_new_product";
import ReportStockMonth from "./components/reports/reporte_stock_mensual/report_stock_month";

import { Redirect, Route, Switch } from "react-router-dom";
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

/* Importar iconos */
import { home, barChart, create, list, person } from "ionicons/icons";

/* Ionic core styles */
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

/* Variables */
import "./theme/variables.css";

/* Páginas */
import Home from "./pages/home/home";
import Reportes from "./pages/reports/reports";
import Registro from "./pages/register-product/register-manual";
import Productos from "./pages/product/mostrar-products";
import EditorProducto from "./pages/product/editor-product";
import Perfil from "./pages/perfil/perfil";

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Switch>
            <Route exact path="/" render={() => <Redirect to="/home" />} />

            {/* Hijas de reportes */}
            <Route exact path="/reportes/productos-almacenados" component={ReportAllProducts} />
            <Route exact path="/reportes/productos-mal-estado" component={ReportBadState} />
            <Route exact path="/reportes/productos-usados" component={ReportUsedProduct} />
            <Route exact path="/reportes/productos-nuevos" component={ReportNewProduct} />
            <Route exact path="/reportes/stock-mensual" component={ReportStockMonth} />

            {/* Padre */}
            <Route exact path="/reportes" component={Reportes} />

            {/* Otras */}
            <Route exact path="/home" component={Home} />
            <Route exact path="/registro" component={Registro} />
            <Route exact path="/productos" component={Productos} />
            <Route exact path="/product/:id" component={EditorProducto} />
            <Route exact path="/perfil" component={Perfil} />
          </Switch>
        </IonRouterOutlet>

        {/* TAB BAR */}
        <IonTabBar slot="bottom">
          <IonTabButton tab="home" href="/home">
            <IonIcon aria-hidden="true" icon={home} />
            <IonLabel>Home</IonLabel>
          </IonTabButton>

          <IonTabButton tab="reportes" href="/reportes">
            <IonIcon aria-hidden="true" icon={barChart} />
            <IonLabel>Reportes</IonLabel>
          </IonTabButton>

          <IonTabButton tab="registro" href="/registro">
            <IonIcon aria-hidden="true" icon={create} />
            <IonLabel>Registro</IonLabel>
          </IonTabButton>

          <IonTabButton tab="productos" href="/productos">
            <IonIcon aria-hidden="true" icon={list} />
            <IonLabel>Productos</IonLabel>
          </IonTabButton>

          <IonTabButton tab="perfil" href="/perfil">
            <IonIcon aria-hidden="true" icon={person} />
            <IonLabel>Perfil</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  </IonApp>
);

export default App;