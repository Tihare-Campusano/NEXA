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
// ... (tus otros imports de CSS)
import "@ionic/react/css/palettes/dark.system.css";
import "./theme/variables.css";

/* Tus páginas de AUTH */
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
  const history = useHistory();
  // En tu archivo App.tsx

  // 👇 PEGA ESTE BLOQUE COMPLETO (REEMPLAZANDO EL TUYO)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {

        if (event === "SIGNED_IN") {
          if (session?.user) {

            // 1. Intenta obtener el perfil (de forma segura, sin fallar si está vacío)
            const { data: profileData } = await supabase
              .from("usuarios")
              .select("nombre")
              .eq("auth_uid", session.user.id)
              .maybeSingle(); // 👈 Usamos maybeSingle() para evitar el error

            // 2. Si NO hay perfil (!profileData), es un usuario nuevo.
            if (!profileData) {
              // 👇 ESTA ES LA LÓGICA QUE TE FALTA:
              const { error: insertError } = await supabase
                .from("usuarios")
                .insert({
                  auth_uid: session.user.id,
                  email: session.user.email,
                  // 'nombre' se deja nulo, para eso lo mandamos a /identificate
                });

              if (insertError) {
                console.error("Error al crear el perfil:", insertError.message);
                history.replace("/login"); // Si falla, que intente de nuevo
              } else {
                // Perfil creado. Ahora SÍ lo mandamos a poner su nombre.
                history.replace("/identificate");
              }

            } else {
              // 3. Si SÍ hay perfil, comprobamos si tiene nombre.
              if (profileData.nombre) {
                // Si tiene nombre, va a la app
                history.replace("/tabs/home");
              } else {
                // Si tiene perfil pero no nombre, va a identificarse
                history.replace("/identificate");
              }
            }
          }
        }
        else if (event === "SIGNED_OUT") {
          history.replace("/login");
        }
      }
    );

    // Función de limpieza
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [history]);

  // ... (el resto de tu componente App.tsx)

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          {/* Rutas Públicas */}
          <Route exact path="/" render={() => <Redirect to="/login" />} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/identificate" component={Identificate} />

          {/* Rutas Protegidas (Tabs) */}
          <Route path="/tabs" render={() => <TabsLayout />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

/* Componente del Layout de Tabs (sin cambios) */
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

        {/* 👇 Esta es la única definición de /product/:id, lo cual es correcto */}
        <Route exact path="/product/:id" component={EditorProducto} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        {/* ... (tus botones de tabs) ... */}
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