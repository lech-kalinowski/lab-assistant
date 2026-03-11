package com.reybanmetalab.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(VoiceShortcutsPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleVoiceIntent(intent);
    }

    private void handleVoiceIntent(Intent intent) {
        String route = resolveRoute(intent);
        if (route != null) {
            VoiceShortcutsPlugin.storePendingRoute(getApplicationContext(), route);
        }
    }

    private String resolveRoute(Intent intent) {
        if (intent == null) {
            return null;
        }

        String route = intent.getStringExtra("voice_route");
        if (route != null && !route.isEmpty()) {
            return route;
        }

        Uri data = intent.getData();
        if (data == null) {
            return null;
        }

        String host = data.getHost();
        String path = data.getPath();
        if ((path == null || path.isEmpty() || "/".equals(path)) && host != null && !host.isEmpty()) {
            path = "/" + host;
        }

        if (path == null || path.isEmpty()) {
            return null;
        }

        if (data.getQuery() == null || data.getQuery().isEmpty()) {
            return path;
        }

        return path + "?" + data.getQuery();
    }
}
