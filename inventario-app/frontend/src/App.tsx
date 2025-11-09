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
// import { supabase } from "./supabaseClient"; // Se comenta, ya no se usa
// import { PostgrestError } from '@supabase/supabase-js'; // Se comenta, ya no se usa

/* CSS de Ionic */
// ... (imports CSS de Ionic)
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

setupIonicReact();

const App: React.FC = () => {
    // const history = useHistory(); // Se comenta, ya no se usa

    // ❌ LÓGICA DE AUTENTICACIÓN Y REDIRECCIÓN ELIMINADA ❌
    // El listener de onAuthStateChange ya no existe aquí.
    // Esto significa que la app no protegerá las rutas ni creará perfiles de forma automática.
    /*
    useEffect(() => {
        console.log("🟢 App.tsx: Listener de autenticación eliminado.");
        return () => {
            // No hay nada que limpiar.
        };
    }, []); 
    */

    return (
        <IonApp>
            <IonReactRouter>
                <IonRouterOutlet>
                    {/* Rutas Públicas (ahora todas son accesibles directamente) */}
                    <Route exact path="/" render={() => <Redirect to="/login" />} />
                    <Route exact path="/login" component={Login} />
                    {/* Ruta eliminada: /identificate */}
                    {/* Rutas con Tabs (ahora desprotegidas) */}
                    <Route path="/tabs" render={() => <TabsLayout />} />
                </IonRouterOutlet>
            </IonReactRouter>
        </IonApp>
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