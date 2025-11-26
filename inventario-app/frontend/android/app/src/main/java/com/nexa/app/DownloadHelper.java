package com.nexa.app;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;

public class DownloadHelper {

    public static void startDownload(Context context, String fileName, String base64Data, String mimeType) {
        try {
            byte[] fileBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);

            java.io.File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            java.io.File outFile = new java.io.File(downloadsDir, fileName);

            java.io.FileOutputStream fos = new java.io.FileOutputStream(outFile);
            fos.write(fileBytes);
            fos.close();

            DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            dm.addCompletedDownload(
                    fileName,
                    "Archivo descargado",
                    true,
                    mimeType,
                    outFile.getAbsolutePath(),
                    fileBytes.length,
                    true
            );

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
