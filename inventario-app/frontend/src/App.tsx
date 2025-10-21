import React, { useEffect } from "react"; // 👈 1. Importa useEffect
import { Redirect, Route, useHistory } from "react-router-dom"; // 👈 2. Importa useHistory
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
import { supabase } from "./supabaseClient"; // 👈 3. Importa supabase

/* CSS de Ionic */
import "@ionic/react/css/core.css";
// ... (tus otros imports de CSS)
import "@ionic/react/css/palettes/dark.system.css";
import "./theme/variables.css";

/* 👇 Tus páginas de AUTH */
import Login from "./pages/login/login";
import Identificate from "./pages/login/identificate";

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
  const history = useHistory(); // 👈 4. Obtén el historial
  
  // 👇 5. ¡NUEVO! EL LISTENER DE AUTENTICACIÓN DE GOOGLE
  useEffect(() => {
    // Este listener se activa cuando el estado de auth cambia (ej: al volver de Google)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        // Si el evento es 'SIGNED_IN', el usuario acaba de iniciar sesión
        if (event === "SIGNED_IN") {
          if (session?.user) {
            // Revisa si el usuario tiene un nombre en la tabla 'usuarios'
            const { data } = await supabase
              .from("usuarios")
              .select("nombre")
              .eq("auth_uid", session.user.id)
              .single();

            if (data?.nombre) {
              // Si tiene nombre, llévalo al inicio
              history.replace("/tabs/home");
            } else {
              // Si NO tiene nombre, llévalo a 'identificate'
              history.replace("/identificate");
            }
          }
        }
        // Si el evento es 'SIGNED_OUT', el usuario cerró sesión
        else if (event === "SIGNED_OUT") {
          // Llévalo al login
          history.replace("/");
        }
      }
    );

    // Función de limpieza: elimina el listener cuando el componente se desmonta
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [history]); // Se ejecuta solo una vez o si 'history' cambia


  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* Rutas (esto ya lo tenías bien) */}
          <Route exact path="/" render={() => <Redirect to="/login" />} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/identificate" component={Identificate} />
          <Route path="/tabs" render={() => <TabsLayout />} />
          <Route exact path="/product/:id" component={EditorProducto} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

/* Componente del Layout de Tabs (esto ya lo tenías bien) */
const TabsLayout: React.FC = () => {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs" render={() => <Redirect to="/tabs/home" />} />
        <Route exact path="/tabs/home" component={Home} />
        <Route exact path="/tabs/reportes" component={Reportes} />
        <Route exact path="/tabs/productos" component={Productos} />
        <Route exact path="/tabs/perfil" component={Perfil} />
        <Route exact path="/tabs/registro" component={RegisterManual} />
        <Route exact path="/tabs/registro/pistola" component={ScannerGun} />
        <Route exact path="/tabs/registro/camera" component={ScannerCamera} />
        <Route exact path="/tabs/registro/ia" component={IAImagen} />
        <Route exact path="/product/:id" component={EditorProducto} />
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
};

export default App;