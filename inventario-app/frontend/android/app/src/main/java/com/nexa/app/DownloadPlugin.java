package com.nexa.app;

import android.content.ContentValues;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.BridgeMethod;

import java.io.OutputStream;

@CapacitorPlugin(name = "DownloadPlugin")
public class DownloadPlugin extends Plugin {

    @BridgeMethod
    public void downloadFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String base64Data = call.getString("base64Data");
        String mimeType = call.getString("mimeType");

        if (fileName == null || base64Data == null) {
            call.reject("Parámetros inválidos");
            return;
        }

        try {
            byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);

            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, "Download/");

            OutputStream os = getContext()
                    .getContentResolver()
                    .openOutputStream(
                            getContext().getContentResolver()
                                    .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    );

            os.write(bytes);
            os.close();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);

        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Error guardando archivo");
        }
    }
}
