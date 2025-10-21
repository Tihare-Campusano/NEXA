import React, { useEffect } from "react";
import { Redirect, Route, useHistory } from "react-router-dom";
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
import { supabase } from "./supabaseClient";

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

/* Páginas de Autenticación */
import Login from "./pages/login/login";
import Identificate from "./pages/login/identificate";

/* Páginas Principales */
import Home from "./pages/home/home";
import Reportes from "./pages/reports/reports";
import Productos from "./pages/product/mostrar-products";
import EditorProducto from "./pages/product/editor-product";
import Perfil from "./pages/perfil/perfil";

/* Páginas de Registro */
import RegisterManual from "./pages/register-product/register-manual";
import ScannerGun from "./pages/register-product/scanner-gun";
import ScannerCamera from "./pages/register-product/scanner-camera";
import IAImagen from "./pages/register-product/ia-images/ia-images";

setupIonicReact();

const App: React.FC = () => {
  const history = useHistory();

  // Listener de Autenticación (CORREGIDO)
  useEffect(() => {
    console.log("🟢 App.tsx: Configurando el listener de autenticación...");

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🟡 App.tsx: Evento de autenticación detectado: ${event}`);

        if (event === "SIGNED_IN") {
          if (session?.user) {
            console.log(`🟢 App.tsx: Usuario INICIÓ SESIÓN: ${session.user.email}`);

            const { data: profileData, error: selectError } = await supabase
              .from("usuarios")
              .select("nombre")
              .eq("auth_uid", session.user.id)
              .maybeSingle();

            if (selectError) {
              console.error("🔴 App.tsx: Error al SELECCIONAR el perfil:", selectError.message);
              return;
            }

            if (!profileData) {
              console.log("🟡 App.tsx: No se encontró perfil. Intentando crear uno nuevo...");

              // 👇 LA CORRECCIÓN CLAVE: AÑADIMOS VALORES POR DEFECTO
              const { error: insertError } = await supabase
                .from("usuarios")
                .insert({
                  auth_uid: session.user.id,
                  email: session.user.email,
                  rol_usuario: 'usuario', // Asigna un rol por defecto
                  activo: true          // Asigna un estado por defecto
                });

              if (insertError) {
                console.error("🔴🔴🔴 App.tsx: ¡ERROR AL CREAR EL PERFIL!", insertError.message);
                history.replace("/login");
              } else {
                console.log("🟢 App.tsx: Perfil creado con éxito. Redirigiendo a /identificate...");
                history.replace("/identificate");
              }
            } else {
              console.log("🟢 App.tsx: Perfil encontrado.");
              if (profileData.nombre) {
                console.log("🟢 App.tsx: El usuario tiene nombre. Redirigiendo a /tabs/home...");
                history.replace("/tabs/home");
              } else {
                console.log("🟡 App.tsx: El usuario no tiene nombre. Redirigiendo a /identificate...");
                history.replace("/identificate");
              }
            }
          }
        } else if (event === "SIGNED_OUT") {
          console.log("🟢 App.tsx: Usuario CERRÓ SESIÓN. Redirigiendo a /login...");
          history.replace("/login");
        }
      }
    );

    return () => {
      console.log("🔵 App.tsx: Limpiando el listener de autenticación.");
      authListener?.subscription?.unsubscribe();
    };
  }, [history]);

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* Rutas Públicas */}
          <Route exact path="/" render={() => <Redirect to="/login" />} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/identificate" component={Identificate} />
          {/* Rutas Protegidas que cargan el layout con Tabs */}
          <Route path="/tabs" render={() => <TabsLayout />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

/* Componente para el Layout de las Rutas con Tabs */
const TabsLayout: React.FC = () => {
  return (
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
        {/* Ruta interna sin Tabs */}
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
