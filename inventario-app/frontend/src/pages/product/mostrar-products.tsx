import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from "@ionic/react";

const Productos: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Productos</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <h1>Ver y Editar Productos ✏️</h1>
      </IonContent>
    </IonPage>
  );
};

export default Productos;
