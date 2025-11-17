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
import { StatusBar, Style } from "@capacitor/status-bar";
import AuthCallback from "./pages/auth/AuthCallback";

/* CSS de Ionic */
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

setupIonicReact({ animated: false });

/* Páginas de Autenticación */
import Login from "./pages/login/login";

/* Páginas Principales */
import Home from "./pages/home/home";
import Reportes from "./pages/reports/reports";
import Productos from "./pages/product/mostrar-products";
import EditorProducto from "./pages/product/editor-product";
import Perfil from "./pages/perfil/perfil";

/* Páginas de Registro */
import RegisterManual from "./pages/register-product/register-manual";

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            {/* Rutas principales */}
            <Route exact path="/" component={Home} />
            <Route exact path="/productos" component={Productos} />
            <Route exact path="/editor-producto" component={EditorProducto} />
            <Route exact path="/reportes" component={Reportes} />
            <Route exact path="/perfil" component={Perfil} />
            <Route exact path="/register-manual" component={RegisterManual} />

            {/* Autenticación */}
            <Route exact path="/login" component={Login} />
            <Route exact path="/auth/callback" component={AuthCallback} />

            {/* Redirección por defecto */}
            <Redirect to="/" />
          </IonRouterOutlet>

          {/* Tabs */}
          <IonTabBar slot="bottom">
            <IonTabButton tab="home" href="/">
              <IonIcon icon={home} />
              <IonLabel>Inicio</IonLabel>
            </IonTabButton>

            <IonTabButton tab="productos" href="/productos">
              <IonIcon icon={list} />
              <IonLabel>Productos</IonLabel>
            </IonTabButton>

            <IonTabButton tab="reportes" href="/reportes">
              <IonIcon icon={barChart} />
              <IonLabel>Reportes</IonLabel>
            </IonTabButton>

            <IonTabButton tab="perfil" href="/perfil">
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