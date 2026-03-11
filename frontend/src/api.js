import { Capacitor } from "@capacitor/core";

const isNativePlatform = Capacitor.isNativePlatform();
const isLocalDev = !isNativePlatform
  && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim()?.replace(/\/$/, "");

function getApiBase() {
  if (configuredApiBase) {
    return configuredApiBase;
  }

  if (isLocalDev) {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }

  return "/api";
}

export function getApiConfigWarning() {
  if (isNativePlatform && !configuredApiBase) {
    return "Native builds need VITE_API_BASE_URL set to your deployed backend API before syncing the app.";
  }

  return null;
}

export async function uploadAudio(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${getApiBase()}/upload`, {
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
  const res = await fetch(`${getApiBase()}/recordings`);
  if (!res.ok) throw new Error("Failed to load recordings");
  return res.json();
}

export async function getRecording(id) {
  const res = await fetch(`${getApiBase()}/recordings/${id}`);
  if (!res.ok) throw new Error("Recording not found");
  return res.json();
}

export async function getMeasurements({ unit, minValue, maxValue } = {}) {
  const params = new URLSearchParams();
  if (unit) params.set("unit", unit);
  if (minValue !== undefined && minValue !== "") params.set("min_value", minValue);
  if (maxValue !== undefined && maxValue !== "") params.set("max_value", maxValue);
  const res = await fetch(`${getApiBase()}/measurements?${params}`);
  if (!res.ok) throw new Error("Failed to load measurements");
  return res.json();
}

export async function deleteRecording(id) {
  const res = await fetch(`${getApiBase()}/recordings/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

export function getExportCsvUrl() {
  return `${getApiBase()}/export/csv`;
}
