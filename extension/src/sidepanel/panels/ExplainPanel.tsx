/** Line-by-line code explanation with beginner/intermediate/interview modes. */
import { useState } from "react";
import { api } from "../../shared/api";
import type { ExplainResponse } from "../../shared/types";
import { useProblem } from "../useProblem";
import { EmptyState, ErrorBox, Skeleton } from "../ui";

type Mode = "beginner" | "intermediate" | "interview";

const MODES: { id: Mode; label: string; emoji: string }[] = [
  { id: "beginner", label: "Beginner", emoji: "🌱" },
  { id: "intermediate", label: "Intermediate", emoji: "⚙️" },
  { id: "interview", label: "Interview", emoji: "🎤" },
];

export function ExplainPanel() {
  const { problem } = useProblem();
  const [mode, setMode] = useState<Mode>("intermediate");
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!problem) {
    return (
      <EmptyState
        emoji="📖"
        title="Explain my code"
        text="Write code for a problem, pick a depth level, and get a line-by-line walkthrough."
      />
    );
  }

  const run = async (m: Mode = mode) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.explain(problem, m);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Explain request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card animate-fade-up">
        <div className="flex gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                void run(m.id);
              }}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
                mode === m.id
                  ? "bg-brand-500/25 text-brand-300 ring-1 ring-brand-400/50"
                  : "bg-base-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
        <button className="btn-primary mt-3 w-full" onClick={() => void run()}>
          ✨ Explain this code
        </button>
      </div>

      {error && <ErrorBox message={error} onRetry={() => void run()} />}
      {loading && (
        <div className="card">
          <Skeleton lines={6} />
        </div>
      )}

      {data && !loading && (
        <div className="space-y-3 animate-fade-up">
          <div className="card border-brand-400/30 bg-brand-500/10">
            <p className="text-xs font-semibold text-brand-300">Overview</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-200">{data.overview}</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-base-600/60">
            {data.lines.map((line, i) => (
              <div
                key={i}
                className={`flex gap-2 border-b border-base-700/40 px-2 py-1.5 ${
                  i % 2 === 0 ? "bg-base-900/60" : "bg-base-900/30"
                }`}
              >
                <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-[10px] text-slate-600">
                  {line.line}
                </span>
                <div className="min-w-0">
                  <code className="block overflow-x-auto whitespace-pre font-mono text-[11px] text-emerald-200/80 scrollbar-thin">
                    {line.code}
                  </code>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{line.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
