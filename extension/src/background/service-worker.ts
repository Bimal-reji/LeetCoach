/**
 * LeetCoach AI — background service worker (MV3, module type).
 *
 * Responsibilities:
 *  - ensure a stable device id,
 *  - cache the currently detected LeetCode problem,
 *  - open the side panel (toolbar click, keyboard shortcut, context menu),
 *  - desktop notifications when an analysis finishes,
 *  - relay messages between content script and side panel.
 */
import { MSG, STORAGE_KEYS } from "../shared/constants";
import type { ExtractedProblem } from "../shared/types";
import { createContextMenus, sendSelectionToPanel } from "./context-menu";
import { ensureDeviceId } from "./device";
import { notifyAnalysisDone } from "./notifications";

// ------------------------------------------------------------------ lifecycle
chrome.runtime.onInstalled.addListener(() => {
  void ensureDeviceId();
  createContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureDeviceId();
});

chrome.runtime.onInstalled.addListener(() => {
  // Opening the panel from the toolbar should not require a gesture on every tab.
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);
});

// ------------------------------------------------------------------ keyboard
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-sidepanel") {
    await openSidePanelForActiveTab();
  }
});

// ------------------------------------------------------------------ context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "leetcoach-ask" || info.menuItemId === "leetcoach-explain" || info.menuItemId === "leetcoach-review") {
    await openSidePanelForActiveTab(tab?.id);
    const text = info.selectionText ?? "";
    const mode =
      info.menuItemId === "leetcoach-explain" ? "explain" : info.menuItemId === "leetcoach-review" ? "review" : "ask";
    if (text) {
      // Let the panel boot before delivering the selection.
      setTimeout(() => void sendSelectionToPanel({ text, mode }), 500);
    }
  }
});

async function openSidePanelForActiveTab(tabId?: number): Promise<void> {
  const target = tabId ?? (await activeTabId());
  if (target === undefined) return;
  try {
    await chrome.sidePanel.open({ tabId: target });
  } catch {
    /* side panel not supported in this context */
  }
}

async function activeTabId(): Promise<number | undefined> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id;
  } catch {
    return undefined;
  }
}

// ------------------------------------------------------------------ messaging
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handleMessage(msg)
    .then(sendResponse)
    .catch(() => sendResponse({ ok: false }));
  return true; // async response
});

async function handleMessage(msg: unknown): Promise<unknown> {
  const { type, payload } = (msg ?? {}) as {
    type?: string;
    payload?: Record<string, unknown>;
  };

  switch (type) {
    case MSG.getDeviceId: {
      const data = await chrome.storage.local.get(STORAGE_KEYS.deviceId);
      return { ok: true, deviceId: data[STORAGE_KEYS.deviceId] ?? (await ensureDeviceId()) };
    }

    case MSG.problemDetected: {
      // Cache the latest extraction so the side panel renders instantly.
      await chrome.storage.local.set({ [STORAGE_KEYS.lastProblem]: payload ?? null });
      return { ok: true };
    }

    case MSG.codeChanged: {
      const data = await chrome.storage.local.get(STORAGE_KEYS.lastProblem);
      if (data[STORAGE_KEYS.lastProblem]) {
        const problem = { ...(data[STORAGE_KEYS.lastProblem] as ExtractedProblem), ...payload };
        await chrome.storage.local.set({ [STORAGE_KEYS.lastProblem]: problem });
      }
      return { ok: true };
    }

    case MSG.getProblem: {
      const data = await chrome.storage.local.get(STORAGE_KEYS.lastProblem);
      return { ok: true, problem: data[STORAGE_KEYS.lastProblem] ?? null };
    }

    case MSG.problemCleared: {
      await chrome.storage.local.remove(STORAGE_KEYS.lastProblem);
      return { ok: true };
    }

    case MSG.openSidePanel: {
      await openSidePanelForActiveTab();
      return { ok: true };
    }

    case MSG.notifyDone: {
      const { title, message } = payload as { title?: string; message?: string };
      await notifyAnalysisDone(title ?? "LeetCoach", message ?? "Analysis complete");
      return { ok: true };
    }

    case MSG.ping:
      return { ok: true, provider: "leetcoach" };

    default:
      return { ok: false, error: "Unknown message type" };
  }
}
