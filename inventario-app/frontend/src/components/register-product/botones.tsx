import { IonButton } from "@ionic/react";
import { useHistory } from "react-router-dom";
import "./botones.css";

const Botones: React.FC = () => {
    const history = useHistory();

    return (
        <div className="botones-container">
            <IonButton
                color="tertiary"
                expand="block"
                onClick={() => history.push("/tabs/registro/camera")}
            >
                Registro con Cámara
            </IonButton>
        </div>
    );
};

export default Botones;