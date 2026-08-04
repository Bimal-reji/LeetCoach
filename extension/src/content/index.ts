/**
 * Content script entry point.
 *
 * Watches for SPA navigation (LeetCode is a Next.js app — the DOM swaps
 * without a page load), re-extracts the problem, and pushes it to the
 * background worker. Also watches the Monaco editor for code changes.
 */
import { MSG } from "../shared/constants";
import type { ExtractedProblem } from "../shared/types";
import { extractProblem, isProblemPage } from "./extractor";

let lastPath = "";
let lastCodeHash = "";
let lastProblem: ExtractedProblem | null = null;

function hash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

async function send(type: string, payload?: unknown): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type, payload });
  } catch {
    /* background not reachable (e.g., extension reloaded) */
  }
}

function notifyProblem(problem: ExtractedProblem | null): void {
  if (problem && (problem.title || problem.slug)) {
    void send(MSG.problemDetected, problem);
    lastProblem = problem;
  } else if (lastProblem) {
    void send(MSG.problemCleared, undefined);
    lastProblem = null;
  }
}

function notifyCodeChange(problem: ExtractedProblem): void {
  void send(MSG.codeChanged, { code: problem.code, language: problem.language });
}

function tick(): void {
  const path = window.location.pathname;
  const onProblem = isProblemPage();

  if (path !== lastPath || !lastProblem) {
    lastPath = path;
    if (onProblem) {
      // Give the SPA a moment to render the description tab.
      setTimeout(() => {
        const problem = extractProblem();
        notifyProblem(problem);
      }, 800);
    } else {
      notifyProblem(null);
    }
    return;
  }

  if (onProblem && lastProblem) {
    const code = extractProblem().code;
    const codeHash = hash(code);
    if (codeHash !== lastCodeHash) {
      lastCodeHash = codeHash;
      if (code) notifyCodeChange({ ...lastProblem, code });
    }
  }
}

// Polling is more reliable than mutation observers against LeetCode's DOM churn.
setInterval(tick, 1500);
tick();

// Also react to visibility changes so the panel refreshes when you return.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});

// Announce readiness.
void send(MSG.ping, undefined);
