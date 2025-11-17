import React, { useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonSpinner,
  useIonToast,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Camera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

const AuthCallback: React.FC = () => {
  const history = useHistory();
  const [present] = useIonToast();

  const toast = (msg: string) =>
    present({ message: msg, duration: 2500, position: 'top' });

  // Solicitar permisos igual que en Login
  const requestPermissions = async (): Promise<boolean> => {
    try {
      // Cámara
      const camPerm = await Camera.requestPermissions();
      if (camPerm.camera !== 'granted') return false;

      // Archivos (solo Android)
      if (Capacitor.getPlatform() === 'android') {
        const fsPerm = await Filesystem.requestPermissions();
        if (!fsPerm.publicStorage) return false;
      }

      // Ubicación
      const geoPerm = await Geolocation.requestPermissions();
      if (geoPerm.location !== 'granted') return false;

      return true;
    } catch (error) {
      console.error('❌ Error solicitando permisos (callback):', error);
      return false;
    }
  };

  useEffect(() => {
    const validateGoogleUser = async () => {
      // 1) Obtener usuario autenticado por Google
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.error('❌ Error al obtener usuario de Google:', error);
        toast('No se pudo obtener el usuario de Google');
        history.replace('/login');
        return;
      }

      const email = user.email;

      // 2) Verificar si el correo existe en tabla "usuarios"
      const { data: perfil, error: perfilError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email) 
        .maybeSingle();

      if (perfilError) {
        console.error('❌ Error consultando tabla usuarios:', perfilError);
      }

      if (!perfil) {
        // ❌ correo NO registrado → no se permite el acceso
        await supabase.auth.signOut();
        toast('Tu correo no está habilitado en el sistema.');
        history.replace('/login');
        return;
      }

      // ⭐⭐⭐ IMPORTANTE:
      // Guardamos usuario en sessionStorage para las páginas /tabs
      sessionStorage.setItem('auth_uid', user.id);
      sessionStorage.setItem('auth_email', user.email!);

      // 3) Pedir permisos antes de entrar
      const granted = await requestPermissions();
      if (!granted) {
        await supabase.auth.signOut();
        toast('Debes conceder permisos para continuar');
        history.replace('/login');
        return;
      }

      // 4) Todo OK → ingresar a la app
      toast(`Bienvenido/a, ${perfil.nombre ?? email}`);
      history.replace('/tabs/home');
    };

    validateGoogleUser();
  }, [history]);

  return (
    <IonPage>
      <IonContent className="ion-text-center ion-padding">
        <IonSpinner />
        <p>Validando acceso...</p>
      </IonContent>
    </IonPage>
  );
};

export default AuthCallback;
