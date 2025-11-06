import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonIcon,
  IonLoading,
  useIonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { logoGoogle } from 'ionicons/icons';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Filesystem, PermissionStatus } from '@capacitor/filesystem';

import LoginForm from '../../components/login/login-form';
import { supabase } from '../../supabaseClient';
import './login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [present] = useIonToast();
  const history = useHistory();

  const toast = (msg: string) =>
    present({ message: msg, duration: 2200, position: 'top' });

  // --- Asegura que el usuario tenga un perfil en la tabla "usuarios"
  const ensureProfile = async (authUid: string) => {
    const { data: perfil, error: selErr } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_uid', authUid)
      .maybeSingle();

    if (selErr) {
      console.warn('[usuarios] select error:', selErr.message);
      return;
    }

    if (!perfil) {
      const { data: u } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from('usuarios').insert({
        auth_uid: authUid,
        email: u.user?.email,
        activo: true,
      });
      if (insErr) console.warn('[usuarios] insert error:', insErr.message);
    }
  };

  // --- Pedir permiso de almacenamiento/descarga sin abrir galería ---
  const requestStoragePermission = async (): Promise<boolean> => {
    try {
      if (Capacitor.getPlatform() === 'android') {
        const status: PermissionStatus = await Filesystem.requestPermissions();
        if (!status.publicStorage) {
          alert(
            'Debes permitir el acceso a archivos/descargas para continuar.'
          );
          return false;
        }
      }

      // En iOS normalmente no se requiere permiso para guardar archivos locales
      return true;
    } catch (err) {
      console.error('Error solicitando permiso de almacenamiento:', err);
      alert('Error al solicitar permisos de almacenamiento.');
      return false;
    }
  };

  // --- Solicitar permisos de Cámara y Almacenamiento
  const requestPermissions = async (): Promise<boolean> => {
    try {
      // 1️⃣ Cámara
      const camPerm = await Camera.requestPermissions();
      if (camPerm.camera !== 'granted') {
        alert('Debes otorgar permiso de Cámara.');
        return false;
      }

      // 2️⃣ Almacenamiento/Descarga de archivos
      const storageGranted = await requestStoragePermission();
      if (!storageGranted) return false;

      return true;
    } catch (err) {
      console.error('Error solicitando permisos:', err);
      alert('Error al solicitar permisos.');
      return false;
    }
  };

  // --- Login con email y contraseña ---
  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !pass) {
      toast('Por favor ingresa email y contraseña');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) {
        toast(error.message);
        return;
      }

      await ensureProfile(data.user.id);

      // 🔑 Solicitar permisos ANTES de navegar al home
      const granted = await requestPermissions();
      if (!granted) return; // El alert ya fue mostrado

      history.replace('/tabs/home');
    } catch (err: any) {
      toast(err?.message ?? 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Login con Google (OAuth) ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/tabs/home' },
      });
      if (error) toast(error.message);
    } catch (err: any) {
      toast(err?.message ?? 'Error con Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="login-page-content">
        <IonLoading isOpen={isLoading} message="Iniciando sesión..." />
        <div className="login-container">
          <img src="/logo.png" alt="Logo de la App" className="login-logo" />
          <h1 className="login-title">Bienvenido</h1>
          <p className="login-subtitle">Inicia sesión para continuar</p>

          <LoginForm
            email={email}
            setEmail={setEmail}
            pass={pass}
            setPass={setPass}
            handleSubmit={handleEmailLogin}
            isLoading={isLoading}
          />

          <div className="separator">o</div>

          <IonButton
            expand="block"
            fill="outline"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="google-button"
          >
            <IonIcon icon={logoGoogle} slot="start" />
            Continuar con Google
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;