package com.nexa.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import java.io.OutputStream;

public class DownloadHelper {

    private static final String TAG = "DownloadHelper";

    public static void saveFile(Context context, String fileName, String base64, String mimeType) {
        try {
            byte[] fileBytes = Base64.decode(base64, Base64.DEFAULT);

            ContentResolver resolver = context.getContentResolver();
            Uri collection;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            } else {
                collection = MediaStore.Files.getContentUri("external");
            }

            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, "Download/");

            Uri uri = resolver.insert(collection, values);

            if (uri == null) {
                throw new Exception("No se pudo crear archivo en MediaStore");
            }

            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) throw new Exception("No se pudo abrir OutputStream");
                out.write(fileBytes);
                out.flush();
            }

            Log.d(TAG, "Archivo guardado correctamente en Descargas: " + fileName);

        } catch (Exception e) {
            Log.e(TAG, "Error guardando archivo", e);
            throw new RuntimeException(e);
        }
    }
}
