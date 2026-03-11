package com.reybanmetalab.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.Nullable;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "VoiceShortcuts")
public class VoiceShortcutsPlugin extends Plugin {
    private static final String PREFS_NAME = "VoiceShortcuts";
    private static final String KEY_PENDING_ROUTE = "pending_route";
    private static VoiceShortcutsPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) {
            instance = null;
        }
    }

    @PluginMethod
    public void consumePendingRoute(PluginCall call) {
        JSObject payload = new JSObject();
        payload.put("route", consumePendingRoute(getContext()));
        call.resolve(payload);
    }

    public static void storePendingRoute(Context context, String route) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Activity.MODE_PRIVATE);
        prefs.edit().putString(KEY_PENDING_ROUTE, route).apply();
        notifyRoute(route);
    }

    @Nullable
    public static String consumePendingRoute(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Activity.MODE_PRIVATE);
        String route = prefs.getString(KEY_PENDING_ROUTE, null);
        prefs.edit().remove(KEY_PENDING_ROUTE).apply();
        return route;
    }

    private static void notifyRoute(String route) {
        if (instance == null) {
            return;
        }

        JSObject payload = new JSObject();
        payload.put("route", route);
        instance.notifyListeners("voiceRoute", payload, true);
    }
}
