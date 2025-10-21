import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// ✅ 1. Importa la función de los PWA elements
import { defineCustomElements } from '@ionic/pwa-elements/loader';

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ✅ 2. Llama a la función para registrar los elementos en la web
defineCustomElements(window);