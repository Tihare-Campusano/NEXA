import React, { useEffect, useRef, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonText,
} from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Result } from "@zxing/library"; // ✅ Import correcto del tipo Result
import { useHistory } from "react-router-dom";
import "./scanner-camera.css";

const RegistroCamara: React.FC = () => {
  const history = useHistory();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      setErrorMsg("");

      // Preferir cámara trasera
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      };

      // Pide acceso a la cámara
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Inicializa el lector de ZXing
      const reader = new BrowserMultiFormatReader();
      codeReaderRef.current = reader;

      // Escaneo continuo sobre el <video>
      reader.decodeFromVideoDevice(
        undefined,
        videoRef.current as HTMLVideoElement,
        (result: Result | undefined, err: unknown) => {
          // Si se detecta un código válido
          if (result?.getText) {
            const code = result.getText();
            stopCamera();
            // Al detectar el código, vuelve al registro con el valor leído
            history.replace("/tabs/registro", { scannedCode: code });
          }
        }
      );
    } catch (err: any) {
      console.error("Error abriendo cámara:", err);
      setErrorMsg(
        "No se pudo abrir la cámara. Revisa permisos o usa un dispositivo físico."
      );
    }
  };

  const stopCamera = () => {
    try {
      (codeReaderRef.current as any)?.reset?.();
    } catch {
      /* ignora errores al resetear */
    }

    const media = (videoRef.current?.srcObject as MediaStream) || null;
    media?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton
            slot="start"
            fill="clear"
            onClick={() => {
              stopCamera();
              history.goBack();
            }}
          >
            <IonIcon icon={arrowBackOutline} />
          </IonButton>
          <IonTitle>Escanear código</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <div className="scanner-wrapper">
          {/* Video de la cámara */}
          <video ref={videoRef} className="camera-video" playsInline muted />

          {/* Overlay: cuadrado de guía */}
          <div className="overlay">
            <div className="overlay-box" />
          </div>

          {errorMsg && (
            <div className="scanner-error">
              <IonText color="danger">{errorMsg}</IonText>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RegistroCamara;
