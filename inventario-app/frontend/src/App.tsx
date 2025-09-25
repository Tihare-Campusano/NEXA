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

/* Importar iconos */
import { home, barChart, create, list, person } from "ionicons/icons";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/* Dark mode */
import "@ionic/react/css/palettes/dark.system.css";

/* Theme variables */
import "./theme/variables.css";

/* Importar las páginas */
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
          {/* Redirigir la raíz hacia /home */}
          <Route exact path="/">
            <Redirect to="/home" />

            {/* rutas */}
          </Route>
          <Route exact path="/home" component={Home} />
          <Route exact path="/reportes" component={Reportes} />
          <Route exact path="/registro" component={Registro} />
          <Route exact path="/product" component={Productos} />
          <Route exact path="/product/:id" component={EditorProducto} />
          <Route exact path="/perfil" component={Perfil} />
        </IonRouterOutlet>

        {/* Rutas para los tabs inferiores */}
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

          <IonTabButton tab="productos" href="/product">
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