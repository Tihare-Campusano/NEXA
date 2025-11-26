package com.nexa.app;

import android.app.DownloadManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class DownloadHelper {

    private static final String TAG = "DownloadHelper";

    public static void startDownload(Context context, String fileName, String base64Data, String mimeType) {
        try {
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Para Android 10+ (Scoped Storage)
                ContentResolver resolver = context.getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);

                if (uri == null) {
                    throw new IllegalStateException("No se pudo crear archivo en Downloads");
                }

                try (OutputStream out = resolver.openOutputStream(uri)) {
                    if (out == null) throw new IllegalStateException("No se pudo abrir OutputStream");
                    out.write(fileBytes);
                    out.flush();
                }

            } else {
                // Compatibilidad con Android 9 o anterior
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                File outFile = new File(downloadsDir, fileName);

                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(fileBytes);
                    fos.flush();
                }

                // Registrar descarga
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
            }

            Log.d(TAG, "Archivo guardado correctamente: " + fileName);

        } catch (Exception e) {
            Log.e(TAG, "Error guardando archivo", e);
            throw new RuntimeException(e);
        }
    }
}
