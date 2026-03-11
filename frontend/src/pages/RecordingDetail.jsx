import { useState, useEffect, useEffectEvent } from "react";
import { getRecording } from "../api";

export default function RecordingDetail({ id, onBack }) {
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRecording = useEffectEvent(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecording(id);
      setRecording(data);
    } catch (err) {
      setError(err.message || "Recording not found");
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    loadRecording();
  }, [id]);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!recording) return <p className="text-red-500">Recording not found</p>;

  // Highlight measurements in transcript
  function highlightTranscript() {
    if (!recording.full_transcript || !recording.measurements.length) {
      return recording.full_transcript || "";
    }

    let text = recording.full_transcript;
    const parts = [];
    let lastIndex = 0;

    // Find and highlight raw_text occurrences
    const matches = [];
    for (const m of recording.measurements) {
      if (!m.raw_text) continue;
      const idx = text.toLowerCase().indexOf(m.raw_text.toLowerCase(), lastIndex);
      if (idx !== -1) {
        matches.push({ start: idx, end: idx + m.raw_text.length, measurement: m });
      }
    }

    matches.sort((a, b) => a.start - b.start);

    for (const match of matches) {
      if (match.start < lastIndex) continue;
      if (match.start > lastIndex) {
        parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex, match.start)}</span>);
      }
      parts.push(
        <mark
          key={`m-${match.start}`}
          className="bg-yellow-200 px-0.5 rounded"
          title={`${match.measurement.value} ${match.measurement.unit}`}
        >
          {text.slice(match.start, match.end)}
        </mark>
      );
      lastIndex = match.end;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex)}</span>);
    }

    return parts;
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block"
      >
        &larr; Back to Recordings
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">{recording.filename}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {recording.uploaded_at ? new Date(recording.uploaded_at).toLocaleString() : ""} &middot;{" "}
          {recording.duration_seconds ? `${recording.duration_seconds.toFixed(1)}s` : "Unknown duration"}
        </p>

        <h3 className="text-sm font-medium text-gray-700 mb-2">Transcript</h3>
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
          {highlightTranscript()}
        </div>
      </div>

      {recording.measurements.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Extracted Measurements ({recording.measurements.length})
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-4">Value</th>
                <th className="pb-2 pr-4">Unit</th>
                <th className="pb-2 pr-4">Raw Text</th>
                <th className="pb-2">Context</th>
              </tr>
            </thead>
            <tbody>
              {recording.measurements.map((m) => (
                <tr key={m.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono font-medium">{m.value}</td>
                  <td className="py-2 pr-4">{m.unit}</td>
                  <td className="py-2 pr-4 text-gray-500">{m.raw_text}</td>
                  <td className="py-2 text-gray-400 text-xs max-w-xs truncate">{m.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
