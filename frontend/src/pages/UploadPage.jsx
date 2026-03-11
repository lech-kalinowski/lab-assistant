import { useState, useRef, useEffect } from "react";
import { uploadAudio } from "../api";
import { getActionFromLocation } from "../appRoutes";
import assistantOrbit from "../assets/assistant-orbit.svg";
import measurementGrid from "../assets/measurement-grid.svg";
import voiceLabHero from "../assets/voice-lab-hero.svg";

const STOP_SIGNAL_KEY = "lab-assistant-stop-signal";
const RECORDING_FORMATS = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/webm", extension: "webm" },
  { mimeType: "audio/mp4;codecs=mp4a.40.2", extension: "m4a" },
  { mimeType: "audio/mp4", extension: "m4a" },
  { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
];

function getSupportedRecordingFormat() {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  if (typeof MediaRecorder.isTypeSupported !== "function") {
    return RECORDING_FORMATS[0];
  }

  return RECORDING_FORMATS.find((format) => MediaRecorder.isTypeSupported(format.mimeType))
    || { mimeType: "", extension: "webm" };
}

function sendStopSignal() {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("lab-app");
    channel.postMessage("stop");
    channel.close();
  }

  try {
    window.localStorage.setItem(STOP_SIGNAL_KEY, String(Date.now()));
    window.localStorage.removeItem(STOP_SIGNAL_KEY);
  } catch {
    // Ignore storage failures in private browsing or locked-down devices.
  }
}

const HERO_TAGS = [
  "AirPods and Beats",
  "Galaxy Buds and Samsung",
  "Ray-Ban Meta and AI wearables",
  "Siri, Google Assistant, and Bixby",
];

const HERO_STATS = [
  { value: "1 tap", label: "from launch to live recording" },
  { value: "3 routes", label: "start, stop, and dashboard shortcuts" },
  { value: "Any mic", label: "upload fallback when recording is blocked" },
];

const WORKFLOW_CARDS = [
  {
    title: "Wearable-first capture",
    description: "Launch from a bud, glasses button, or assistant shortcut and land directly in the recorder.",
  },
  {
    title: "Measurement extraction",
    description: "Convert spoken notes into transcript text and structured values without leaving the same screen.",
  },
  {
    title: "Cross-device fallback",
    description: "If the browser blocks recording, the same homepage still accepts audio uploads from phone storage.",
  },
];

export default function UploadPage({ onUploaded }) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [stopTabMessage, setStopTabMessage] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const actionHandledRef = useRef(false);
  const cleanupStopListenersRef = useRef(() => {});
  const recordingFormatRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      cleanupStopListeners();
    };
  }, []);

  // Handle URL query parameters for voice-controlled recording
  useEffect(() => {
    const action = getActionFromLocation();
    if (!action || actionHandledRef.current) return;
    actionHandledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.has("action")) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (action === "record") {
      startRecording({ autoTriggered: true });
    } else if (action === "stop") {
      sendStopSignal();
      setStopTabMessage("Stopping recording in the other tab... You can close this tab.");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function cleanupStopListeners() {
    cleanupStopListenersRef.current();
    cleanupStopListenersRef.current = () => {};
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
      broadcastChannelRef.current = null;
    }
  }

  function setupStopListeners() {
    cleanupStopListeners();

    const cleanups = [];

    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("lab-app");
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data === "stop") {
          stopRecording();
        }
      };
      cleanups.push(() => channel.close());
    }

    function handleStorage(event) {
      if (event.key === STOP_SIGNAL_KEY && event.newValue) {
        stopRecording();
      }
    }

    window.addEventListener("storage", handleStorage);
    cleanups.push(() => window.removeEventListener("storage", handleStorage));

    cleanupStopListenersRef.current = () => {
      cleanups.forEach((cleanup) => cleanup());
      broadcastChannelRef.current = null;
    };
  }

  async function handleFile(file) {
    setError(null);
    setResult(null);
    setUploading(true);
    try {
      const data = await uploadAudio(file);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function startRecording({ autoTriggered = false } = {}) {
    if (recording || uploading) return;

    setError(null);
    setResult(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("unsupported-microphone");
      }

      const recordingFormat = getSupportedRecordingFormat();
      if (!recordingFormat) {
        throw new Error("unsupported-recorder");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const recorderOptions = recordingFormat.mimeType ? { mimeType: recordingFormat.mimeType } : undefined;
      const mediaRecorder = recorderOptions ? new MediaRecorder(stream, recorderOptions) : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      recordingFormatRef.current = recordingFormat;
      chunksRef.current = [];
      setupStopListeners();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        clearInterval(timerRef.current);
        setRecording(false);
        cleanupStopListeners();
        stream.getTracks().forEach((t) => t.stop());

        if (chunksRef.current.length === 0) {
          setError("No audio was captured. Please try again.");
          return;
        }

        const blobType = recordingFormatRef.current?.mimeType || chunksRef.current[0]?.type || "audio/webm";
        const extension = recordingFormatRef.current?.extension || "webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        const file = new File([blob], `recording.${extension}`, { type: blobType });
        handleFile(file);
      };

      mediaRecorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      cleanupStopListeners();

      if (err?.message === "unsupported-microphone" || err?.message === "unsupported-recorder") {
        setError("This browser does not support in-app audio recording. Try a newer mobile browser or upload an audio file instead.");
        return;
      }

      if (autoTriggered) {
        setError("Automatic recording could not start. If your phone blocks microphone access on launch, open the app once and tap Start Recording.");
        return;
      }

      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    setRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      cleanupStopListeners();
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function handleInputChange(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }

  const statusBadge = uploading
    ? { label: "Processing", className: "bg-amber-100 text-amber-900" }
    : recording
      ? { label: "Live capture", className: "bg-rose-100 text-rose-900" }
      : { label: "Mic standby", className: "bg-emerald-100 text-emerald-900" };

  // If this tab was opened just to send the "stop" signal, show a minimal UI
  if (stopTabMessage) {
    return (
      <div className="rounded-[28px] border border-white/70 bg-white/85 p-10 text-center shadow-[0_32px_90px_-52px_rgba(15,23,42,0.55)] backdrop-blur">
        <p className="text-lg font-semibold text-slate-900">{stopTabMessage}</p>
        <p className="mt-3 text-sm text-slate-600">
          The voice shortcut opened a helper tab to stop the active recording session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[36px] border border-slate-900/10 bg-[linear-gradient(135deg,#132033_0%,#134454_52%,#eda65d_100%)] p-8 text-white shadow-[0_38px_120px_-56px_rgba(15,23,42,0.85)] sm:p-10 lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,231,173,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(96,214,226,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(127,255,221,0.16),transparent_28%)]" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100">
              Voice Lab for wearable AI
            </div>
            <h2 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Headset-first recording with artwork, motion, and a clearer product story.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-100/88 sm:text-lg">
              This homepage now leads with original visual assets for the core use case: capture voice from
              AirPods, Galaxy Buds, AI glasses, or phone assistants and turn the result into structured lab
              measurements.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {HERO_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/16 bg-slate-950/18 px-4 py-2 text-sm text-slate-100"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {HERO_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-white/12 bg-slate-950/18 p-4 backdrop-blur-sm"
                >
                  <div className="text-2xl font-semibold text-amber-100">{stat.value}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-100/76">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-950/16 p-3 shadow-[0_26px_70px_-42px_rgba(15,23,42,0.92)] backdrop-blur-sm">
              <img
                src={voiceLabHero}
                alt="Abstract generated artwork of smart glasses, sound waves, and audio controls"
                className="h-full w-full rounded-[24px] object-cover"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/16 p-3 backdrop-blur-sm">
                <img
                  src={assistantOrbit}
                  alt="Generated microphone and assistant orbit artwork"
                  className="h-full w-full rounded-[20px] object-cover"
                />
              </div>
              <div className="overflow-hidden rounded-[26px] border border-white/10 bg-slate-950/16 p-3 backdrop-blur-sm">
                <img
                  src={measurementGrid}
                  alt="Generated dashboard artwork with waveform and measurement panels"
                  className="h-full w-full rounded-[20px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <div className="rounded-[32px] border border-white/70 bg-white/88 p-6 shadow-[0_34px_110px_-56px_rgba(15,23,42,0.42)] backdrop-blur sm:p-8">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Record Audio</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                Capture a spoken note or drop in a file.
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                The recorder is ready for direct microphone capture, headset-triggered shortcuts, and manual
                upload when the browser does not allow instant recording.
              </p>
            </div>

            <div className={`rounded-full px-4 py-2 text-sm font-semibold ${statusBadge.className}`}>
              {statusBadge.label}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#fffef8_0%,#f2f7f7_100%)] p-8 sm:p-12">
            {uploading ? (
              <div className="text-center">
                <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
                <p className="text-lg font-semibold text-slate-900">Processing audio with Whisper...</p>
                <p className="mt-2 text-sm text-slate-500">Longer recordings can take a little longer to finish.</p>
              </div>
            ) : recording ? (
              <div className="text-center">
                <div className="mb-6 flex items-center justify-center gap-3">
                  <span className="relative flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-rose-500"></span>
                  </span>
                  <span className="text-lg font-semibold text-rose-700">Recording in progress</span>
                </div>
                <div className="mx-auto mb-8 flex h-40 w-40 items-center justify-center rounded-full bg-slate-950 text-5xl font-semibold tracking-tight text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.75)]">
                  {formatTime(elapsed)}
                </div>
                <button
                  onClick={stopRecording}
                  className="rounded-full bg-rose-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  Stop Recording
                </button>
              </div>
            ) : (
              <div className="text-center">
                <button
                  onClick={() => startRecording()}
                  className="rounded-full bg-slate-950 px-8 py-4 text-lg font-semibold text-white shadow-[0_28px_70px_-36px_rgba(15,23,42,0.78)] transition-transform hover:-translate-y-0.5"
                >
                  Start Recording
                </button>
                <p className="mt-5 text-sm text-slate-500">Tap to record spoken measurements from your phone or wearable flow.</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-950"
                >
                  Upload Audio File
                </button>
                <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-white px-3 py-1">WAV</span>
                  <span className="rounded-full bg-white px-3 py-1">MP3</span>
                  <span className="rounded-full bg-white px-3 py-1">M4A</span>
                  <span className="rounded-full bg-white px-3 py-1">WEBM</span>
                  <span className="rounded-full bg-white px-3 py-1">OGG</span>
                  <span className="rounded-full bg-white px-3 py-1">FLAC</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wav,.mp3,.m4a,.webm,.ogg,.flac"
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {WORKFLOW_CARDS.map((card, index) => (
            <div
              key={card.title}
              className="rounded-[28px] border border-white/75 bg-white/88 p-6 shadow-[0_24px_90px_-58px_rgba(15,23,42,0.45)] backdrop-blur"
            >
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                0{index + 1}
              </div>
              <h4 className="mt-3 text-xl font-semibold text-slate-950">{card.title}</h4>
              <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
            </div>
          ))}
        </aside>
      </section>

      {error && (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-rose-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-[30px] border border-white/75 bg-white/90 p-6 shadow-[0_32px_100px_-60px_rgba(15,23,42,0.42)] backdrop-blur sm:p-8">
          <h3 className="text-2xl font-semibold text-slate-950">Processing Complete</h3>
          <p className="mt-2 text-sm text-slate-500">
            {result.filename} &middot; {result.duration_seconds?.toFixed(1)}s &middot;{" "}
            {result.measurements_count} measurement{result.measurements_count !== 1 ? "s" : ""} found
          </p>

          <div className="mt-6">
            <h4 className="mb-2 text-sm font-medium text-slate-700">Transcript</h4>
            <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{result.transcript}</p>
          </div>

          {result.measurements.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-3 text-sm font-medium text-slate-700">Extracted Measurements</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 pr-4">Value</th>
                    <th className="pb-2 pr-4">Unit</th>
                    <th className="pb-2">Raw Text</th>
                  </tr>
                </thead>
                <tbody>
                  {result.measurements.map((m, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-mono">{m.value}</td>
                      <td className="py-2 pr-4">{m.unit}</td>
                      <td className="py-2 text-slate-500">{m.raw_text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={onUploaded}
            className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            View All Recordings
          </button>
        </div>
      )}
    </div>
  );
}
