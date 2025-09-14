import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from "@ionic/react";

const Perfil: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <h1>Tu Perfil 👤</h1>
      </IonContent>
    </IonPage>
  );
};

export default Perfil;
