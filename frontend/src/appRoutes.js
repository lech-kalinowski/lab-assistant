export const TAB_PATHS = {
  Record: "/",
  Recordings: "/recordings",
  Measurements: "/measurements",
  "Hands-Free": "/assistant",
};

export const ACTION_PATHS = {
  open: "/",
  record: "/record",
  stop: "/stop",
};

export const ACTION_ALIASES = {
  open: ["/open"],
  record: ["/start", "/lab-start"],
  stop: ["/finish", "/lab-finish"],
};

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") return "/";
  const [pathWithoutQuery] = pathname.split(/[?#]/, 1);
  const normalized = pathWithoutQuery.replace(/\/+$/, "");
  return normalized || "/";
}

export function getActionFromPath(pathname) {
  const normalizedPathname = normalizePathname(pathname);

  for (const action of ["record", "stop"]) {
    const paths = [ACTION_PATHS[action], ...(ACTION_ALIASES[action] || [])];
    if (paths.includes(normalizedPathname)) {
      return action;
    }
  }

  return null;
}

export function getActionFromLocation(location = window.location) {
  const params = new URLSearchParams(location.search);
  const queryAction = params.get("action");

  if (queryAction === "record" || queryAction === "stop") {
    return queryAction;
  }

  return getActionFromPath(location.pathname);
}

export function getTabStateFromPath(pathname) {
  const normalizedPathname = normalizePathname(pathname);
  const detailMatch = normalizedPathname.match(/^\/recordings\/(\d+)$/);

  if (detailMatch) {
    return {
      tab: "RecordingDetail",
      selectedRecordingId: Number(detailMatch[1]),
    };
  }

  if (normalizedPathname === TAB_PATHS.Recordings) {
    return { tab: "Recordings", selectedRecordingId: null };
  }

  if (normalizedPathname === TAB_PATHS.Measurements) {
    return { tab: "Measurements", selectedRecordingId: null };
  }

  if (normalizedPathname === TAB_PATHS["Hands-Free"]) {
    return { tab: "Hands-Free", selectedRecordingId: null };
  }

  return { tab: "Record", selectedRecordingId: null };
}

export function getTabStateFromLocation(location = window.location) {
  return getTabStateFromPath(location.pathname);
}

export function getPathForState(tab, selectedRecordingId = null) {
  if (tab === "RecordingDetail" && selectedRecordingId) {
    return `/recordings/${selectedRecordingId}`;
  }

  return TAB_PATHS[tab] || "/";
}

export function getActionUrl(action, origin = window.location.origin) {
  const path = ACTION_PATHS[action] || ACTION_PATHS.open;
  return new URL(path, origin).toString();
}

export function getSpeakableActionUrl(action, origin = window.location.origin) {
  const path = ACTION_ALIASES[action]?.[0] || ACTION_PATHS[action] || ACTION_PATHS.open;
  return new URL(path, origin).toString();
}
