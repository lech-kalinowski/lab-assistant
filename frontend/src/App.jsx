import { useState } from "react";
import UploadPage from "./pages/UploadPage";
import RecordingsPage from "./pages/RecordingsPage";
import RecordingDetail from "./pages/RecordingDetail";
import MeasurementsPage from "./pages/MeasurementsPage";

const TABS = ["Record", "Recordings", "Measurements"];

export default function App() {
  const [tab, setTab] = useState("Record");
  const [selectedRecordingId, setSelectedRecordingId] = useState(null);

  function handleViewRecording(id) {
    setSelectedRecordingId(id);
    setTab("RecordingDetail");
  }

  function handleBack() {
    setSelectedRecordingId(null);
    setTab("Recordings");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Lab Assistant
          </h1>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedRecordingId(null); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  (tab === t || (t === "Recordings" && tab === "RecordingDetail"))
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {tab === "Record" && <UploadPage onUploaded={() => setTab("Recordings")} />}
        {tab === "Recordings" && <RecordingsPage onViewRecording={handleViewRecording} />}
        {tab === "RecordingDetail" && selectedRecordingId && (
          <RecordingDetail id={selectedRecordingId} onBack={handleBack} />
        )}
        {tab === "Measurements" && <MeasurementsPage />}
      </main>
    </div>
  );
}
