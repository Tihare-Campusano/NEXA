import { registerPlugin } from "@capacitor/core";

export const DownloadPlugin = registerPlugin<{
  downloadFile(options: {
    fileName: string;
    base64: string;
    mimeType: string;
  }): Promise<{ success: boolean }>;
}>("DownloadPlugin");

export async function descargarAndroid(
  fileName: string,
  base64: string,
  mimeType: string
) {
  return await DownloadPlugin.downloadFile({ fileName, base64, mimeType });
}
