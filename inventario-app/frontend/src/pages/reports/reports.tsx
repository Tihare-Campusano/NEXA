import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
} from "@ionic/react";
import {
  documentTextOutline,
  warningOutline,
  repeatOutline,
  addCircleOutline,
  trendingDownOutline,
} from "ionicons/icons";

const Reportes: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reportes</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <h2 style={{ padding: "16px" }}>Selecciona un reporte 📊</h2>

        <IonList>
          <IonItem routerLink="/reportes/productos-almacenados" routerDirection="forward">
            <IonIcon icon={documentTextOutline} slot="start" />
            <IonLabel>Reporte de productos almacenados</IonLabel>
          </IonItem>

          <IonItem routerLink="/reportes/productos-mal-estado" routerDirection="forward">
            <IonIcon icon={warningOutline} slot="start" color="danger" />
            <IonLabel>Reporte de productos en mal estado</IonLabel>
          </IonItem>

          <IonItem routerLink="/reportes/productos-usados" routerDirection="forward">
            <IonIcon icon={repeatOutline} slot="start" color="medium" />
            <IonLabel>Reporte de productos usados</IonLabel>
          </IonItem>

          <IonItem routerLink="/reportes/productos-nuevos" routerDirection="forward">
            <IonIcon icon={addCircleOutline} slot="start" color="success" />
            <IonLabel>Reporte de productos nuevos</IonLabel>
          </IonItem>

          <IonItem routerLink="/reportes/stock-mensual" routerDirection="forward">
            <IonIcon icon={trendingDownOutline} slot="start" color="warning" />
            <IonLabel>Reporte de stock mensual</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Reportes;






