/** Extension-wide constants and storage keys. */

export const DEFAULT_BACKEND_URL = "http://localhost:8000";

export const STORAGE_KEYS = {
  deviceId: "leetcoach.deviceId",
  settings: "leetcoach.settings", // { backendUrl?: string }
  lastProblem: "leetcoach.lastProblem",
  lastAnalysis: "leetcoach.lastAnalysis",
  notified: "leetcoach.notified",
} as const;

export const LEETCODE_MATCHES = "https://*.leetcode.com/*";

/** Storage schema for chrome.storage.local (keyed by STORAGE_KEYS). */
export interface SettingsShape {
  backendUrl?: string;
}

export interface LastAnalysisShape {
  hintLevel: number;
  solutionRevealed: boolean;
}

export const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "#00b8a3",
  Medium: "#ffc01e",
  Hard: "#ff375f",
  "": "#8b949e",
};

export const SEVERITY_COLORS: Record<string, string> = {
  info: "#58a6ff",
  warning: "#ffc01e",
  critical: "#ff375f",
};

/** Chrome messaging protocol (content <-> background <-> side panel). */
export const MSG = {
  problemDetected: "leetcoach:problem-detected",
  problemCleared: "leetcoach:problem-cleared",
  codeChanged: "leetcoach:code-changed",
  getProblem: "leetcoach:get-problem",
  getDeviceId: "leetcoach:get-device-id",
  ensureDeviceId: "leetcoach:ensure-device-id",
  openSidePanel: "leetcoach:open-side-panel",
  askSelection: "leetcoach:ask-selection",
  notifyDone: "leetcoach:notify-done",
  ping: "leetcoach:ping",
} as const;
