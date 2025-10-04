import { FaUserCircle } from "react-icons/fa";
import "./Perfil.css"; // 👈 CSS propio

export default function Perfil() {
  // Datos de usuario mockeados (luego los puedes traer de Supabase)
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
    <div style={{ padding: "1rem" }}>
      <br />
      {/* Título con ícono */}
      <h2 className="titulo-centrado">
        <FaUserCircle /> Perfil
      </h2>
      <br />

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
          backgroundColor: "#00bfff", // celeste
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
  );
}