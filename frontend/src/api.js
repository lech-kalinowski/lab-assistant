// In production (same-origin), use relative /api. In local dev, hit port 8000.
const isLocalDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = isLocalDev
  ? `${window.location.protocol}//${window.location.hostname}:8000/api`
  : "/api";

export async function uploadAudio(file, onProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function getRecordings() {
  const res = await fetch(`${API_BASE}/recordings`);
  return res.json();
}

export async function getRecording(id) {
  const res = await fetch(`${API_BASE}/recordings/${id}`);
  if (!res.ok) throw new Error("Recording not found");
  return res.json();
}

export async function getMeasurements({ unit, minValue, maxValue } = {}) {
  const params = new URLSearchParams();
  if (unit) params.set("unit", unit);
  if (minValue !== undefined && minValue !== "") params.set("min_value", minValue);
  if (maxValue !== undefined && maxValue !== "") params.set("max_value", maxValue);
  const res = await fetch(`${API_BASE}/measurements?${params}`);
  return res.json();
}

export async function deleteRecording(id) {
  const res = await fetch(`${API_BASE}/recordings/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

export function getExportCsvUrl() {
  return `${API_BASE}/export/csv`;
}
