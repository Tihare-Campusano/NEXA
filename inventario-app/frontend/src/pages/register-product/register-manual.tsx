import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from "@ionic/react";

const Registro: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Registro</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <h1>Formulario de Registro 📝</h1>
      </IonContent>
    </IonPage>
  );
};

export default Registro;
