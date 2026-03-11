import { useState, useEffect } from "react";
import { getRecordings, deleteRecording } from "../api";

export default function RecordingsPage({ onViewRecording }) {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  async function loadRecordings() {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecordings();
      setRecordings(data);
    } catch (err) {
      setError(err.message || "Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this recording and all its measurements?")) return;
    await deleteRecording(id);
    setRecordings((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return <p className="text-gray-500">Loading recordings...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">No recordings yet</p>
        <p className="text-gray-400 text-sm mt-1">Upload an audio file to get started</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recordings</h2>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 bg-gray-50 border-b">
              <th className="px-4 py-3">Filename</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Measurements</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {recordings.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{r.filename}</td>
                <td className="px-4 py-3 text-gray-500">
                  {r.uploaded_at ? new Date(r.uploaded_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {r.duration_seconds ? `${r.duration_seconds.toFixed(1)}s` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {r.measurements_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => onViewRecording(r.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-red-500 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
