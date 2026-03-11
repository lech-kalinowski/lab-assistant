import { useEffect, useState } from "react";
import UploadPage from "./pages/UploadPage";
import RecordingsPage from "./pages/RecordingsPage";
import RecordingDetail from "./pages/RecordingDetail";
import MeasurementsPage from "./pages/MeasurementsPage";
import HandsFreePage from "./pages/HandsFreePage";
import { getActionFromPath, getPathForState, getTabStateFromLocation, getTabStateFromPath } from "./appRoutes";
import { getApiConfigWarning } from "./api";
import { attachVoiceRouteListeners, consumeInitialVoiceRoute } from "./voiceShortcuts";

const TABS = ["Record", "Recordings", "Measurements", "Hands-Free"];

export default function App() {
  const [routeState, setRouteState] = useState(() => getTabStateFromLocation());
  const [recordViewKey, setRecordViewKey] = useState(0);
  const { tab, selectedRecordingId } = routeState;
  const apiConfigWarning = getApiConfigWarning();

  useEffect(() => {
    function handlePopState() {
      setRouteState(getTabStateFromLocation());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextTab, nextRecordingId = null, options = {}) {
    const nextPath = getPathForState(nextTab, nextRecordingId);
    if (!options.replace && window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    } else if (options.replace) {
      window.history.replaceState({}, "", nextPath);
    }

    setRouteState({ tab: nextTab, selectedRecordingId: nextRecordingId });
  }

  function handleExternalRoute(path) {
    const nextRouteState = getTabStateFromPath(path);
    navigate(nextRouteState.tab, nextRouteState.selectedRecordingId);

    if (getActionFromPath(path) && nextRouteState.tab === "Record") {
      setRecordViewKey((current) => current + 1);
    }
  }

  useEffect(() => {
    let removeListeners = () => {};

    async function bindVoiceShortcuts() {
      const initialRoute = await consumeInitialVoiceRoute();
      if (initialRoute) {
        handleExternalRoute(initialRoute);
      }

      removeListeners = await attachVoiceRouteListeners(handleExternalRoute);
    }

    bindVoiceShortcuts();

    return () => {
      removeListeners();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleViewRecording(id) {
    navigate("RecordingDetail", id);
  }

  function handleBack() {
    navigate("Recordings");
  }

  return (
    <div className="min-h-screen bg-transparent">
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-950">
            Lab Assistant
          </h1>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => navigate(t)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  (tab === t || (t === "Recordings" && tab === "RecordingDetail"))
                    ? "bg-slate-950 text-amber-200"
                    : "text-slate-600 hover:bg-white/80"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {apiConfigWarning && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {apiConfigWarning}
          </div>
        )}
        {tab === "Record" && (
          <UploadPage
            key={recordViewKey}
            onUploaded={() => navigate("Recordings")}
          />
        )}
        {tab === "Recordings" && <RecordingsPage onViewRecording={handleViewRecording} />}
        {tab === "RecordingDetail" && selectedRecordingId && (
          <RecordingDetail id={selectedRecordingId} onBack={handleBack} />
        )}
        {tab === "Measurements" && <MeasurementsPage />}
        {tab === "Hands-Free" && <HandsFreePage />}
      </main>
    </div>
  );
}
