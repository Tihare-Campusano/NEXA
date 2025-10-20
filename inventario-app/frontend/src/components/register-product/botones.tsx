import { IonButton } from "@ionic/react";
import { useHistory } from "react-router-dom";
import "./Botones.css";

const Botones: React.FC = () => {
    const history = useHistory();

    return (
        <div className="botones-container">
            <IonButton
                color="primary"
                expand="block"
                onClick={() => history.push("/tabs/registro")}
            >
                Registro manual
            </IonButton>
            <IonButton
                color="secondary"
                expand="block"
                onClick={() => history.push("/tabs/registro/pistola")}
            >
                Registro con pistola
            </IonButton>
            <IonButton
                color="tertiary"
                expand="block"
                onClick={() => history.push("/tabs/registro/camera")}
            >
                Registro con cámara
            </IonButton>
        </div>
    );
};

export default Botones;