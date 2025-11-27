import { registerPlugin } from "@capacitor/core";

export interface DownloadPlugin {
  descargarAndroid(
    fileName: string,
    base64: string,
    mimeType: string
  ): Promise<{ success: boolean }>;
}

const DownloadPlugin = registerPlugin<DownloadPlugin>("DownloadPlugin", {
  web: () => ({
    descargarAndroid: async () => {
      console.warn("DownloadPlugin solo funciona en Android.");
      return { success: false };
    },
  }),
});

export const descargarAndroid = DownloadPlugin.descargarAndroid;
