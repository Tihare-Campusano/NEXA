import { IonPage, IonContent, IonText } from "@ionic/react";
import HeaderApp from "../../components/header_app";
import { supabase } from "../../supabaseClient";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export default function RegistroPistola() {
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("Escanee un código...");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        procesarCodigo(codigo);
        setCodigo("");
        return;
      }

      // Acumula caracteres enviados por la pistola
      if (e.key.length === 1) {
        setCodigo((prev) => prev + e.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [codigo]);

  const procesarCodigo = async (valor: string) => {
    if (!valor) return;

    setMensaje("Buscando producto...");

    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("codigo_barras", valor)
      .single();

    if (error) {
      setMensaje("❌ No se encontró el producto");
    } else {
      setMensaje(`✅ ${data.nombre} (${data.marca})`);

      // Vibración al leer correctamente ✅
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
    }

    // Asegurar que el input siga en foco tras cada lectura
    inputRef.current?.focus();
  };

  return (
    <IonPage>
      <HeaderApp title="Registro Pistola USB" />
      <IonContent
        className="ion-padding"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Campo oculto para mantener foco del lector */}
        <input
          ref={inputRef}
          autoFocus
          style={{
            position: "absolute",
            opacity: 0,
            height: 0,
            width: 0,
          }}
        />

        <IonText>
          <h2 style={{ textAlign: "center" }}>{mensaje}</h2>
        </IonText>
      </IonContent>
    </IonPage>
  );
}

