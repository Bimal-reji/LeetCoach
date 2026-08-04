/** React hook exposing the currently-detected LeetCode problem. */
import { useCallback, useEffect, useState } from "react";
import { MSG, STORAGE_KEYS } from "../shared/constants";
import type { ExtractedProblem } from "../shared/types";

export interface SelectionRequest {
  text: string;
  mode?: "ask" | "explain" | "review";
}

export function useProblem() {
  const [problem, setProblem] = useState<ExtractedProblem | null>(null);
  const [pendingSelection, setPendingSelection] = useState<SelectionRequest | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await chrome.storage.local.get(STORAGE_KEYS.lastProblem);
      setProblem((data[STORAGE_KEYS.lastProblem] as ExtractedProblem) ?? null);
    } catch {
      /* ignore */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const listener = (msg: { type?: string; payload?: unknown }) => {
      switch (msg.type) {
        case MSG.problemDetected:
          setProblem((msg.payload as ExtractedProblem) ?? null);
          break;
        case MSG.problemCleared:
          setProblem(null);
          break;
        case MSG.askSelection:
          setPendingSelection((msg.payload as SelectionRequest) ?? null);
          break;
        default:
          break;
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    // Re-poll every 2s as a safety net against missed events.
    const timer = setInterval(() => void refresh(), 2000);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      clearInterval(timer);
    };
  }, [refresh]);

  return { problem, pendingSelection, clearSelection: () => setPendingSelection(null), refresh, ready };
}
