package com.nexa.app;

import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DownloadPlugin")
public class DownloadPlugin extends Plugin {

    @PluginMethod
    public void downloadFile(com.getcapacitor.PluginCall call) {
        String fileName = call.getString("fileName");
        String base64 = call.getString("base64");
        String mimeType = call.getString("mimeType");

        if (fileName == null || base64 == null) {
            call.reject("Datos incompletos");
            return;
        }

        Context context = getContext();
        DownloadHelper.startDownload(context, fileName, base64, mimeType);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
