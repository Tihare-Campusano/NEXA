package com.nexa.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // No plugins nativos adicionales
        registerPlugin(DownloadPlugin.class);
    }
}
