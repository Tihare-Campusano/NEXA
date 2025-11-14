import React, { ReactNode } from "react";
import { IonHeader, IonToolbar } from "@ionic/react";
import ThemeToggle from "./ThemeToggle"; // 🌙 Botón modo oscuro
import "./header_app.css";

interface HeaderAppProps {
  title?: string;
  icon?: ReactNode; // icono opcional
}

const HeaderApp: React.FC<HeaderAppProps> = ({
  title = "Gestor de Inventarios",
  icon,
}) => (
  <IonHeader>
    <IonToolbar className="app-header">
      <div className="app-header-content">
        {/* Centro: icono y título */}
        <div className="app-header-left">
          {icon && <span className="app-header-icon">{icon}</span>}
          <h1 className="app-header-title">{title}</h1>
        </div>

        {/* Derecha: botón tema */}
        <div className="app-header-right">
          <ThemeToggle />
        </div>
      </div>
    </IonToolbar>
  </IonHeader>
);

export default HeaderApp;
