import React from "react";
import { IonButton, IonIcon } from "@ionic/react";
import { moon, sunny } from "ionicons/icons";
import { ThemeContext } from "../contexts/ThemeContext";

const ThemeToggle: React.FC = () => {
  const { theme, toggle } = React.useContext(ThemeContext);

  return (
    <IonButton fill="clear" onClick={toggle} aria-label="Cambiar tema" title="Cambiar tema">
      <IonIcon icon={theme === "dark" ? sunny : moon} />
    </IonButton>
  );
};

export default ThemeToggle;
