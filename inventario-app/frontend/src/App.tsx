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

/* Páginas principales */
import Home from "./pages/home/home";
import Reportes from "./pages/reports/reports";
import Productos from "./pages/product/mostrar-products";
import EditorProducto from "./pages/product/editor-product";
import Perfil from "./pages/perfil/perfil";

/* Páginas de registro */
import RegisterManual from "./pages/register-product/register-manual";
import ScannerGun from "./pages/register-product/scanner-gun";
import ScannerCamera from "./pages/register-product/scanner-camera";
import IAImagen from "./pages/register-product/ia-images/ia-images";

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
            <Route exact path="/tabs/productos" component={Productos} />
            <Route exact path="/tabs/perfil" component={Perfil} />
            
            {/* ========== Rutas de Registro (variantes) ========== */}
            <Route exact path="/tabs/registro" component={RegisterManual} />
            <Route exact path="/tabs/registro/pistola" component={ScannerGun} />
            <Route exact path="/tabs/registro/camera" component={ScannerCamera} />
            <Route exact path="/tabs/registro/ia" component={IAImagen} />
            
            {/* Editor de producto (sin tabs) */}
            <Route exact path="/product/:id" component={EditorProducto} />
            
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