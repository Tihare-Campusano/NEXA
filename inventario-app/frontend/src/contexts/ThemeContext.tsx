import React from "react";
import { AppTheme, applyTheme, initTheme } from "../lib/theme";
import { StatusBar, Style } from "@capacitor/status-bar";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
  toggle: () => void;
};

export const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggle: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = React.useState<AppTheme>(() => initTheme());

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    applyTheme(t);

    // 🔥 Cambiar color de texto de la StatusBar según tema
    if (t === "dark") {
      StatusBar.setStyle({ style: Style.Dark }); // texto claro (blanco)
    } else {
      StatusBar.setStyle({ style: Style.Light }); // texto oscuro (negro)
    }
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  // ✅ Aplica el estilo correcto también al cargar la app
  React.useEffect(() => {
    if (theme === "dark") {
      StatusBar.setStyle({ style: Style.Dark });
    } else {
      StatusBar.setStyle({ style: Style.Light });
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};