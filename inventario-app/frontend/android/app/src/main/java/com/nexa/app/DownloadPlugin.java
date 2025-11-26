package com.nexa.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;

public class DownloadPlugin extends Plugin {

    @PluginMethod
    public void descargarAndroid(PluginCall call) {
        String fileName = call.getString("fileName");
        String base64 = call.getString("base64");
        String mimeType = call.getString("mimeType");

        DownloadHelper.startDownload(getContext(), fileName, base64, mimeType);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
