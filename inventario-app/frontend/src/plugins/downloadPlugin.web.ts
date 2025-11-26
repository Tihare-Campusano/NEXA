export class DownloadWeb {
  async downloadFile(): Promise<{ success: boolean }> {
    console.warn("DownloadPlugin: Web stub ejecutado (no hace nada).");
    return { success: true };
  }
}
