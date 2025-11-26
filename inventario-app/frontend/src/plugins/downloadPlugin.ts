import { registerPlugin } from "@capacitor/core";

export const DownloadPlugin = registerPlugin<{
  downloadFile(options: {
    fileName: string;
    base64: string;
    mimeType: string;
  }): Promise<{ success: boolean }>;
}>("DownloadPlugin");

// Función para usar en tu app
export const descargarAndroid = async (
  fileName: string,
  base64: string,
  mime: string
) => {
  try {
    await DownloadPlugin.downloadFile({
      fileName,
      base64,
      mimeType: mime,
    });

    console.log("Archivo descargado con éxito ✔️");
  } catch (e) {
    console.error("Error en descarga:", e);
  }
};