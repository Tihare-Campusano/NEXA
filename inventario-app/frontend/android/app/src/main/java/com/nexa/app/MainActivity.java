package com.nexa.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.nexa.app.DownloadPlugin; // Import plugin

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Registro del plugin personalizado
        registerPlugin(DownloadPlugin.class);
    }
}
