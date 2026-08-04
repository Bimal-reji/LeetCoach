/** Toolbar popup — quick status and actions. */
import { useEffect, useState } from "react";
import { api } from "../shared/api";
import { MSG, STORAGE_KEYS } from "../shared/constants";
import type { ExtractedProblem, ProgressResponse } from "../shared/types";

export function App() {
  const [problem, setProblem] = useState<ExtractedProblem | null>(null);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    void chrome.storage.local.get(STORAGE_KEYS.lastProblem).then((data) => {
      setProblem((data[STORAGE_KEYS.lastProblem] as ExtractedProblem) ?? null);
    });
    api
      .progress()
      .then(setProgress)
      .catch(() => setProgress(null));
    api
      .health()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  const openPanel = () => {
    void chrome.runtime.sendMessage({ type: MSG.openSidePanel });
    window.close();
  };

  const hasProblem = Boolean(problem && (problem.title || problem.slug));

  return (
    <div className="bg-base-950 p-3 text-slate-100">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-sm font-black text-white">
          L
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-extrabold tracking-tight">LeetCoach AI</h1>
          <p className="flex items-center gap-1 text-[10px] text-slate-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                backendOk === null ? "bg-slate-500" : backendOk ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            {backendOk === null ? "checking backend…" : backendOk ? "connected" : "backend offline — hint mode unavailable"}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Streak" value={`🔥 ${progress?.streak ?? "—"}`} />
        <Stat label="Solved" value={`✅ ${progress?.solvedCount ?? "—"}`} />
        <Stat label="Points" value={`⭐ ${progress?.points ?? "—"}`} />
      </div>

      {/* Problem status */}
      <div className="mt-3 rounded-xl border border-base-600/60 bg-base-850 p-3">
        {hasProblem ? (
          <>
            <p className="truncate text-xs font-semibold text-slate-100">{problem!.title || problem!.slug}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {problem!.difficulty || "Unknown difficulty"} · {problem!.language}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-slate-500">
            🧭 Open a problem on leetcode.com to coach it.
          </p>
        )}
      </div>

      {/* Actions */}
      <button className="btn-primary mt-3 w-full" onClick={openPanel}>
        🚀 Open LeetCoach panel
      </button>
      <button
        className="btn-ghost mt-2 w-full"
        onClick={() => window.open("http://localhost:5173", "_blank")}
      >
        📊 Open dashboard
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-base-600/50 bg-base-800/70 px-2 py-1.5 text-center">
      <p className="text-sm font-bold text-slate-100">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
