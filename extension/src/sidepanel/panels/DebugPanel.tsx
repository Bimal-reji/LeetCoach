/** Debug assistant: paste the judge error, get pointed fixes. */
import { useState } from "react";
import { api } from "../../shared/api";
import type { DebugResponse } from "../../shared/types";
import { useProblem } from "../useProblem";
import { EmptyState, ErrorBox, Skeleton, Spinner } from "../ui";

const PRESETS = ["Time Limit Exceeded", "Wrong Answer", "IndexError: index out of range", "Runtime Error"];

export function DebugPanel() {
  const { problem } = useProblem();
  const [errorText, setErrorText] = useState("");
  const [data, setData] = useState<DebugResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!problem) {
    return (
      <EmptyState
        emoji="🐞"
        title="Debug assistant"
        text="When your code fails, paste the error message and I'll list likely mistakes, edge cases, missing conditions and tests."
      />
    );
  }

  const analyze = async (text = errorText) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.debug(problem, text.trim());
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Debug request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card animate-fade-up">
        <h3 className="text-sm font-bold text-slate-100">What does the judge say?</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button key={p} className="chip bg-base-700/70 text-slate-400 transition hover:bg-brand-500/20 hover:text-brand-300" onClick={() => void analyze(p)}>
              {p}
            </button>
          ))}
        </div>
        <textarea
          className="input mt-3 min-h-[70px] resize-y font-mono text-xs"
          placeholder="Paste the error / failed test case here…"
          value={errorText}
          onChange={(e) => setErrorText(e.target.value)}
        />
        <button className="btn-primary mt-2 w-full" disabled={loading || !errorText.trim()} onClick={() => void analyze()}>
          {loading ? <Spinner /> : "🔍"} Analyze failure
        </button>
      </div>

      {error && <ErrorBox message={error} onRetry={() => void analyze()} />}
      {loading && (
        <div className="card">
          <Skeleton lines={4} />
        </div>
      )}

      {data && !loading && (
        <div className="space-y-3 animate-fade-up">
          <ResultSection title="Possible mistakes" items={data.possibleMistakes} color="#fb7185" icon="💥" />
          <ResultSection title="Edge cases to check" items={data.edgeCases} color="#38bdf8" icon="🧊" />
          <ResultSection title="Missing conditions" items={data.missingConditions} color="#fbbf24" icon="⚠️" />
          <ResultSection title="Suggested tests" items={data.suggestedTests} color="#34d399" icon="🧪" />
        </div>
      )}
    </div>
  );
}

function ResultSection({
  title,
  items,
  color,
  icon,
}: {
  title: string;
  items: string[];
  color: string;
  icon: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="card animate-fade-up">
      <h4 className="text-xs font-bold" style={{ color }}>
        {icon} {title}
      </h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-300">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
