import React, { ReactNode } from "react";
import { IonHeader, IonToolbar } from "@ionic/react";
import "./header_app.css";

interface HeaderAppProps {
    title?: string;
    icon?: ReactNode; // icono opcional
}

const HeaderApp: React.FC<HeaderAppProps> = ({ title = "Gestor de Inventarios", icon }) => (
    <IonHeader>
        <IonToolbar className="app-header">
            <div className="app-header-content">
                {/* Solo mostramos el icono si se pasó */}
                {icon && <span className="app-header-icon">{icon}</span>}
                <h1 className="app-header-title">{title}</h1>
            </div>
        </IonToolbar>
    </IonHeader>
);

export default HeaderApp;