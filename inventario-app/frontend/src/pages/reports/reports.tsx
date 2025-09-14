import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from "@ionic/react";

const Reportes: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reportes</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <h1>Aquí verás los Reportes 📊</h1>
      </IonContent>
    </IonPage>
  );
};

export default Reportes;