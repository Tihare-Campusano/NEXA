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

import "@ionic/react/css/palettes/dark.system.css";

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
import ScannerGun from "./pages/register-product/registro_pistola";
import ScannerCamera from "./pages/register-product/scanner-camera";
import IAImagen from "./pages/register-product/ia-images/ia-images";

/* ✅ Importamos el ThemeProvider */
import { ThemeProvider } from "./contexts/ThemeContext";

setupIonicReact();

const App: React.FC = () => {
  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setStyle({ style: Style.Dark });  // texto claro (para barra oscura)
  StatusBar.setStyle({ style: Style.Light }); // texto oscuro (para barra clara)

  return (
    /* 🟢 Envolvemos toda la app dentro del ThemeProvider */
    <ThemeProvider>
      <IonApp>
        <IonReactRouter>
          <IonRouterOutlet>
            {/* Rutas Públicas */}
            <Route exact path="/" render={() => <Redirect to="/login" />} />
            <Route exact path="/login" component={Login} />
            {/* Rutas con Tabs */}
            <Route path="/tabs" render={() => <TabsLayout />} />
          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    </ThemeProvider>
  );
};

/* Componente para el Layout de las Rutas con Tabs */
const TabsLayout: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route exact path="/tabs" render={() => <Redirect to="/tabs/home" />} />
      {/* Rutas con Tabs */}
      <Route exact path="/tabs/home" component={Home} />
      <Route exact path="/tabs/reportes" component={Reportes} />
      <Route exact path="/tabs/productos" component={Productos} />
      <Route exact path="/tabs/perfil" component={Perfil} />
      {/* Rutas de Registro */}
      <Route exact path="/tabs/registro" component={RegisterManual} />
      <Route exact path="/tabs/registro/pistola" component={ScannerGun} />
      <Route exact path="/tabs/registro/camera" component={ScannerCamera} />
      <Route exact path="/tabs/registro/ia" component={IAImagen} />
      {/* Ruta interna con Tabs para detalle de producto */}
      <Route exact path="/tabs/product/:id" component={EditorProducto} />
    </IonRouterOutlet>

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
);

export default App;
