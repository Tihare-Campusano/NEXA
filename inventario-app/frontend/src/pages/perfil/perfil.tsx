// src/pages/Perfil/Perfil.tsx
import { FaUserCircle } from "react-icons/fa";
import "./Perfil.css";
import { IonPage, IonContent } from "@ionic/react";
import HeaderApp from "../../components/header_app";

export default function Perfil() {
  // Datos de usuario mockeados
  const usuario = {
    alias: "Usuario123",
    email: "gendarmeria@gmail.com",
    rol: "Encargado de Inventario",
    fechaIngreso: "2025-09-15",
  };

  const handleLogout = () => {
    console.log("Cerrar sesión");
  };

  const handleSoporte = () => {
    console.log("Ir a Soporte");
  };

  return (
    <IonPage>
      {/* 🔹 Header reutilizable con icono de perfil */}
      <HeaderApp
        title="Perfil"
        icon={<FaUserCircle size={28} className="text-green-400" />}
      />
      <IonContent>
        <div style={{ padding: "1rem" }}>
          {/* Tarjeta de perfil */}
          <div className="perfil-card">
            <div className="perfil-item">
              <p className="perfil-label">Alias</p>
              <p className="perfil-value">{usuario.alias}</p>
            </div>

            <div className="perfil-item">
              <p className="perfil-label">Correo</p>
              <p className="perfil-value">{usuario.email}</p>
            </div>

            <div className="perfil-item">
              <p className="perfil-label">Rol</p>
              <p className="perfil-value">{usuario.rol}</p>
            </div>

            <div className="perfil-item">
              <p className="perfil-label">Fecha de Ingreso</p>
              <p className="perfil-value">{usuario.fechaIngreso}</p>
            </div>
          </div>

          {/* Botón soporte */}
          <button
            className="btn-soporte"
            onClick={handleSoporte}
            style={{
              backgroundColor: "#00bfff",
              color: "white",
              padding: "10px 20px",
              marginTop: "20px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              display: "block",
              width: "100%",
            }}
          >
            Soporte
          </button>
          <br />

          {/* Botón cerrar sesión */}
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}