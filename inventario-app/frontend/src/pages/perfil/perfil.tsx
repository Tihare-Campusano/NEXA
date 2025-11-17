import { useEffect, useState } from "react";
import { IonPage, IonContent } from "@ionic/react";
import { FaUserCircle } from "react-icons/fa";
import HeaderApp from "../../components/header_app";
import { supabase } from "../../supabaseClient";
import "./perfil.css";

type PerfilDB = {
  nombre: string | null;
  rol: string | null;
  email: string | null;
  auth_id: string | null;
};

export default function Perfil() {
  const [usuarioAuth, setUsuarioAuth] = useState<any>(null);
  const [perfilDB, setPerfilDB] = useState<PerfilDB | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    const obtenerPerfil = async () => {
      setCargando(true);
      setError(null);

      // 1) Usuario autenticado
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("❌ getUser:", error.message);
        setError("Error al obtener usuario");
        setCargando(false);
        return;
      }

      const user = data.user;
      if (!user) {
        setCargando(false);
        return;
      }
      setUsuarioAuth(user);
      console.log("✅ Usuario autenticado:", user.email, user.id);

      // 2) Traer perfil desde tabla usuarios por auth_id (sin fecha_ingreso)
      const { data: row, error: err1 } = await supabase
        .from("usuarios")
        .select("nombre, rol, email, auth_id")
        .eq("auth_id", user.id)
        .single();

      console.log("📋 by auth_id row:", row);
      if (err1) console.error("❗ by auth_id err:", err1);

      if (activo) {
        setPerfilDB(row ?? null);
        setCargando(false);
      }
    };

    obtenerPerfil();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        setUsuarioAuth(null);
        setPerfilDB(null);
      }
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace("/login");
  };

  const handleSoporte = () => {
    window.location.href = "/soporte";
  };

  const fechaBonita = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-CL");
  };

  return (
    <IonPage>
      <HeaderApp
        title="Perfil"
        icon={<FaUserCircle size={28} className="text-green-400" />}
      />
      <IonContent>
        <div style={{ padding: "1rem" }}>
          {cargando ? (
            <p style={{ textAlign: "center" }}>Cargando datos del usuario...</p>
          ) : !usuarioAuth ? (
            <p style={{ textAlign: "center" }}>
              No hay sesión activa. <a href="/login">Iniciar sesión</a>
            </p>
          ) : (
            <>
              <div className="perfil-card">
                <div className="perfil-item">
                  <p className="perfil-label">Correo</p>
                  <p className="perfil-value">{usuarioAuth.email}</p>
                </div>

                <div className="perfil-item">
                  <p className="perfil-label">Nombre</p>
                  <p className="perfil-value">
                    {perfilDB?.nombre ||
                      usuarioAuth?.user_metadata?.nombre ||
                      "—"}
                  </p>
                </div>

                <div className="perfil-item">
                  <p className="perfil-label">Rol</p>
                  <p className="perfil-value">
                    {perfilDB?.rol || usuarioAuth?.user_metadata?.rol || "—"}
                  </p>
                </div>

                <div className="perfil-item">
                  <p className="perfil-label">Fecha de Registro</p>
                  <p className="perfil-value">
                    {fechaBonita(usuarioAuth.created_at)}
                  </p>
                </div>
              </div>

              {/* <button
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
              </button> */}

              <button
                className="btn-logout"
                onClick={handleLogout}
                style={{
                  marginTop: "10px",
                  backgroundColor: "#ff4d4f",
                  color: "white",
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "block",
                  width: "100%",
                }}
              >
                Cerrar Sesión
              </button>

              {error && (
                <p style={{ marginTop: 12, color: "tomato" }}>{error}</p>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
