package com.nexa.app;

import android.content.ContentValues;
import android.content.Context;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.MimeTypeMap;

import java.io.OutputStream;

public class DownloadHelper {

    public static void saveFile(Context context, String fileName, String base64Data, String mimeType) {
        try {
            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);

            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, "Download/");

            // Insert into MediaStore
            OutputStream os;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                android.net.Uri uri = context.getContentResolver().insert(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        values
                );

                os = context.getContentResolver().openOutputStream(uri);
            } else {
                // fallback viejo
                String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
                java.io.File file = new java.io.File(
                        android.os.Environment.getExternalStoragePublicDirectory(
                                android.os.Environment.DIRECTORY_DOWNLOADS
                        ),
                        fileName
                );
                os = new java.io.FileOutputStream(file);
            }

            os.write(fileBytes);
            os.flush();
            os.close();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
