import { Capacitor, registerPlugin } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

const VoiceShortcuts = registerPlugin("VoiceShortcuts");

function normalizeUrlPath(urlString) {
  if (!urlString) return null;

  try {
    const url = new URL(urlString);
    const directPath = `${url.pathname || ""}${url.search || ""}`;
    if (url.protocol.startsWith("http")) {
      return directPath || "/";
    }

    const hostPath = url.host ? `/${url.host}${url.pathname || ""}` : (url.pathname || "/");
    return `${hostPath}${url.search || ""}`;
  } catch {
    return null;
  }
}

export async function consumeInitialVoiceRoute() {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const launch = await CapacitorApp.getLaunchUrl();
    const launchPath = normalizeUrlPath(launch?.url);
    if (launchPath) {
      return launchPath;
    }
  } catch {
    // Ignore launch URL failures and fall back to the native shortcut bridge.
  }

  try {
    const result = await VoiceShortcuts.consumePendingRoute();
    return result?.route || null;
  } catch {
    return null;
  }
}

export async function attachVoiceRouteListeners(onRoute) {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  const listeners = [];

  try {
    const appListener = await CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      const route = normalizeUrlPath(url);
      if (route) {
        onRoute(route);
      }
    });
    listeners.push(appListener);
  } catch {
    // Ignore missing app-url support on platforms where the native bridge is enough.
  }

  try {
    const voiceListener = await VoiceShortcuts.addListener("voiceRoute", ({ route }) => {
      if (route) {
        onRoute(route);
      }
    });
    listeners.push(voiceListener);
  } catch {
    // Ignore missing native plugin support in web builds.
  }

  return async () => {
    await Promise.all(listeners.map((listener) => listener.remove()));
  };
}
