import { useState, useRef, useEffect } from "react";
import { uploadAudio } from "../api";

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  // Handle URL query parameters for voice-controlled recording
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (!action) return;

    // Clean URL so refresh doesn't re-trigger
    window.history.replaceState({}, "", window.location.pathname);

    if (action === "record") {
      // Start recording and listen for cross-tab "stop" signal
      const channel = new BroadcastChannel("lab-app");
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data === "stop") {
          stopRecording();
        }
      };

      startRecording();
    } else if (action === "stop") {
      // Signal the recording tab to stop, then show confirmation
      const channel = new BroadcastChannel("lab-app");
      channel.postMessage("stop");
      channel.close();
      setStopTabMessage("Stopping recording in the other tab... You can close this tab.");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function startRecording() {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        handleFile(file);
      };

      mediaRecorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access and try again.");
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current);
    setRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
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

  // If this tab was opened just to send the "stop" signal, show a minimal UI
  if (stopTabMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <p className="text-gray-600 text-lg">{stopTabMessage}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Record Audio</h2>

      <div className="flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 p-16">
        {uploading ? (
          <div className="text-center">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Processing audio with Whisper...</p>
            <p className="text-gray-400 text-sm mt-2">This may take a moment for longer recordings</p>
          </div>
        ) : recording ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
              </span>
              <span className="text-red-600 font-medium text-lg">Recording</span>
            </div>
            <p className="text-4xl font-mono text-gray-900 mb-8">{formatTime(elapsed)}</p>
            <button
              onClick={stopRecording}
              className="px-8 py-4 bg-red-600 text-white rounded-full text-lg font-semibold hover:bg-red-700 transition-colors shadow-lg"
            >
              Stop Recording
            </button>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={startRecording}
              className="px-8 py-4 bg-blue-600 text-white rounded-full text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg mb-6"
            >
              Start Recording
            </button>
            <p className="text-gray-400 text-sm mb-4">Tap to record spoken measurements</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-500 hover:text-blue-700 text-sm underline"
            >
              or upload a file
            </button>
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

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Complete</h3>
          <p className="text-sm text-gray-500 mb-4">
            {result.filename} &middot; {result.duration_seconds?.toFixed(1)}s &middot;{" "}
            {result.measurements_count} measurement{result.measurements_count !== 1 ? "s" : ""} found
          </p>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">Transcript</h4>
            <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">{result.transcript}</p>
          </div>

          {result.measurements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Measurements</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-4">Value</th>
                    <th className="pb-2 pr-4">Unit</th>
                    <th className="pb-2">Raw Text</th>
                  </tr>
                </thead>
                <tbody>
                  {result.measurements.map((m, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-mono">{m.value}</td>
                      <td className="py-2 pr-4">{m.unit}</td>
                      <td className="py-2 text-gray-500">{m.raw_text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={onUploaded}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            View All Recordings
          </button>
        </div>
      )}
    </div>
  );
}
