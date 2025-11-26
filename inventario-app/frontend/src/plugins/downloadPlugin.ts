import { registerPlugin } from "@capacitor/core";

export const DownloadPlugin = registerPlugin<{
  downloadFile(options: {
    fileName: string;
    base64: string;
    mimeType: string;
  }): Promise<{ success: boolean }>;
}>("DownloadPlugin", {
  web: () => import("../plugins/downloadPlugin.web").then((m) => new m.DownloadWeb()),
});

export const descargarAndroid = async (
  fileName: string,
  base64: string,
  mimeType: string
) => {
  try {
    await DownloadPlugin.downloadFile({
      fileName,
      base64,
      mimeType,
    });

    console.log("Archivo descargado con éxito ✔️");
  } catch (e) {
    console.error("Error en descarga:", e);
  }
};
