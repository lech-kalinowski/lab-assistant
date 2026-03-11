import { useState, useEffect } from "react";
import { getMeasurements, getExportCsvUrl } from "../api";

const INITIAL_FILTERS = { unit: "", minValue: "", maxValue: "" };

export default function MeasurementsPage() {
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialMeasurements() {
      try {
        setError(null);
        const data = await getMeasurements(INITIAL_FILTERS);
        if (!cancelled) {
          setMeasurements(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load measurements");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialMeasurements();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMeasurements(nextFilters = filters) {
    setLoading(true);
    setError(null);
    try {
      const data = await getMeasurements(nextFilters);
      setMeasurements(data);
    } catch (err) {
      setError(err.message || "Failed to load measurements");
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleSearch(e) {
    e.preventDefault();
    loadMeasurements(filters);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Measurements</h2>
        <a
          href={getExportCsvUrl()}
          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Export CSV
        </a>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
          <input
            type="text"
            value={filters.unit}
            onChange={(e) => handleFilterChange("unit", e.target.value)}
            placeholder="e.g. mL, °C"
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-32"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Min Value</label>
          <input
            type="number"
            step="any"
            value={filters.minValue}
            onChange={(e) => handleFilterChange("minValue", e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-28"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Max Value</label>
          <input
            type="number"
            step="any"
            value={filters.maxValue}
            onChange={(e) => handleFilterChange("maxValue", e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-28"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Filter
        </button>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading measurements...</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      ) : measurements.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No measurements found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b">
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Raw Text</th>
                <th className="px-4 py-3">Context</th>
                <th className="px-4 py-3">Recording</th>
                <th className="px-4 py-3">Extracted At</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{m.value}</td>
                  <td className="px-4 py-3">{m.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{m.raw_text}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{m.context}</td>
                  <td className="px-4 py-3 text-gray-500">#{m.recording_id}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {m.extracted_at ? new Date(m.extracted_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
