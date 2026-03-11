import { useEffect, useState } from "react";
import { getActionUrl, getSpeakableActionUrl } from "../appRoutes";

const ACTIONS = [
  {
    key: "open",
    label: "Open app",
    description: "Launches the dashboard in the phone browser or installed web app.",
  },
  {
    key: "record",
    label: "Start recording",
    description: "Opens the recorder view and starts listening when the browser allows microphone access.",
  },
  {
    key: "stop",
    label: "Stop recording",
    description: "Sends a stop signal to the active recording tab so you can finish hands-free.",
  },
];

const PLATFORM_GUIDES = {
  ios: {
    title: "iPhone + AirPods + Siri",
    lead: "Best path: add the web app to the Home Screen, then create Siri shortcuts with distinct phrases that open these links.",
    steps: [
      "Open this app in Safari and use Share > Add to Home Screen.",
      "In Shortcuts, create one shortcut for Start recording and one for Stop recording with the Open URLs action.",
      "Use the recommended phrases below. They are intentionally farther apart than 'record' and 'stop'.",
    ],
  },
  samsung: {
    title: "Samsung phone + Galaxy Buds + Bixby",
    lead: "Best path: install the web app, then point a Bixby setup, Samsung routine, or browser shortcut at the hands-free links below.",
    steps: [
      "Install the app from Samsung Internet or Chrome if the install option is offered.",
      "Use the recommended phrases below so start and stop are less likely to be confused in a noisy lab.",
      "On newer Galaxy devices where Quick Commands are limited, fall back to a browser shortcut or routine that opens the matching URL.",
    ],
  },
  android: {
    title: "Android phone + Bluetooth headset + Google assistant",
    lead: "Best path: install the app, then save these links in a launcher shortcut, assistant routine, or browser shortcut.",
    steps: [
      "Install the web app when Chrome offers it.",
      "Use the recommended phrases below when naming the shortcut or routine.",
      "Use the Start and Stop links as the targets for those shortcuts so you can finish without touching the screen.",
    ],
  },
  desktop: {
    title: "Desktop or unsupported device",
    lead: "You can still use the same links from another app, QR code, or browser bookmark.",
    steps: [
      "Keep the app installed or pinned in the browser.",
      "Use Start recording to jump directly into capture mode.",
      "Use Stop recording from another tab or shortcut when the recording is running.",
    ],
  },
};

const VOICE_PRESETS = [
  {
    key: "open",
    title: "Dashboard phrase",
    phrase: "Lab Assistant Dashboard",
    action: "open",
    reason: "Opens the app without triggering a microphone session.",
  },
  {
    key: "record",
    title: "Start phrase",
    phrase: "Lab Assistant Start",
    action: "record",
    reason: "Start is clearer than record when used with headset microphones and phone assistants.",
  },
  {
    key: "stop",
    title: "Finish phrase",
    phrase: "Lab Assistant Finish",
    action: "stop",
    reason: "Finish is less likely to be confused with start than stop is.",
  },
];

function detectPlatform() {
  const userAgent = navigator.userAgent || "";
  const vendor = navigator.vendor || "";

  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return "ios";
  }

  if (/SamsungBrowser|SM-|Galaxy/i.test(userAgent)) {
    return "samsung";
  }

  if (/Android/i.test(userAgent) || /Google Inc\./i.test(vendor)) {
    return "android";
  }

  return "desktop";
}

function buildGuideOrder(platform) {
  return [platform, "android", "samsung", "ios", "desktop"].filter(
    (value, index, list) => list.indexOf(value) === index,
  );
}

export default function HandsFreePage() {
  const [copiedAction, setCopiedAction] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [platform] = useState(() => detectPlatform());
  const [preparedPreset, setPreparedPreset] = useState(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function handleCopy(actionKey, url) {
    try {
      if (!navigator.clipboard?.writeText) {
        window.prompt("Copy this link", url);
      } else {
        await navigator.clipboard.writeText(url);
      }

      setCopiedAction(actionKey);
      window.setTimeout(() => setCopiedAction(null), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  async function handleInstall() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  async function copyText(value) {
    if (!navigator.clipboard?.writeText) {
      window.prompt("Copy this setup", value);
      return false;
    }

    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      window.prompt("Copy this setup", value);
      return false;
    }
  }

  async function handlePreparePreset(preset) {
    const canonicalUrl = getActionUrl(preset.action);
    const speakableUrl = getSpeakableActionUrl(preset.action);
    const setupText = [
      `Phrase: ${preset.phrase}`,
      "Shortcut action: Open URLs",
      `Primary URL: ${canonicalUrl}`,
      `Speakable URL alias: ${speakableUrl}`,
    ].join("\n");

    await copyText(setupText);
    setPreparedPreset(preset.key);
    window.setTimeout(() => setPreparedPreset(null), 2500);

    if (platform === "ios") {
      window.location.assign("shortcuts://create-shortcut");
    }
  }

  const orderedGuides = buildGuideOrder(platform);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              Hands-Free Access
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">
              Use the app from AirPods, Galaxy Buds, Pixel Buds, and other headset flows
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              This app stays web-based, so the reliable integration pattern is simple: install the app, then
              make your phone assistant open one of the links below. That works better across Android,
              Samsung, and iPhone than pretending there is a native assistant SDK here.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {installPrompt && (
              <button
                onClick={handleInstall}
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                Install App
              </button>
            )}
            <a
              href={getActionUrl("record")}
              className="rounded-full bg-sky-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-sky-700"
            >
              Test Start Recording
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">1. Install once</p>
            <p className="mt-1 text-sm text-slate-600">
              Give microphone permission once on the phone so assistant-launched sessions can reuse it.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">2. Save the links</p>
            <p className="mt-1 text-sm text-slate-600">
              Use the URLs below in Siri Shortcuts, Bixby commands, browser shortcuts, or Android routines.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">3. Speak the shortcut</p>
            <p className="mt-1 text-sm text-slate-600">
              Your headset triggers the phone assistant, which opens the app in the right state.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {ACTIONS.map((action) => {
          const url = getActionUrl(action.key);

          return (
            <article key={action.key} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{action.label}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{action.description}</p>
              <div className="mt-4 rounded-2xl bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100 break-all">
                {url}
              </div>
              <div className="mt-4 flex gap-3">
                <a
                  href={url}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                >
                  Open
                </a>
                <button
                  onClick={() => handleCopy(action.key, url)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  {copiedAction === action.key ? "Copied" : "Copy Link"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Recommended Phrases</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
              Best-practice commands are preselected for you
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            Use these exact phrases when creating Siri shortcuts, Bixby setups, or Android routines.
            They are deliberately more distinct than saying record and stop.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {VOICE_PRESETS.map((preset) => {
            const canonicalUrl = getActionUrl(preset.action);
            const speakableUrl = getSpeakableActionUrl(preset.action);
            const speakablePath = new URL(speakableUrl).pathname;

            return (
              <article key={preset.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{preset.title}</p>
                <p className="mt-3 text-2xl font-semibold text-slate-900">{preset.phrase}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{preset.reason}</p>
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-900">Primary URL</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-600">{canonicalUrl}</p>
                  {speakableUrl !== canonicalUrl && (
                    <>
                      <p className="mt-3 font-medium text-slate-900">Speakable URL alias</p>
                      <p className="mt-1 font-mono text-xs text-slate-600">{speakablePath}</p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handlePreparePreset(preset)}
                  className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                >
                  {platform === "ios"
                    ? preparedPreset === preset.key
                      ? "Prepared"
                      : "Prepare in Shortcuts"
                    : preparedPreset === preset.key
                      ? "Copied"
                      : "Copy Setup"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Setup Guides</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
              Recommended flow for {PLATFORM_GUIDES[platform].title}
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">
            If a voice assistant cannot open a raw web link directly, save the link as a shortcut or routine
            first and trigger that by voice.
          </p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {orderedGuides.map((guideKey) => {
            const guide = PLATFORM_GUIDES[guideKey];

            return (
              <article
                key={guideKey}
                className={`rounded-3xl border p-6 ${
                  guideKey === platform
                    ? "border-sky-200 bg-sky-50"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <h4 className="text-lg font-semibold text-slate-900">{guide.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{guide.lead}</p>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                  {guide.steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
