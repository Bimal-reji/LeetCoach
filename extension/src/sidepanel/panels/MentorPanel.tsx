/** The core mentoring experience: progressive hints + gated solution. */
import { useState } from "react";
import { api } from "../../shared/api";
import { MSG } from "../../shared/constants";
import type { HintsResponse, SolutionResponse } from "../../shared/types";
import { useProblem } from "../useProblem";
import { CodeBlock, EmptyState, ErrorBox, Skeleton, Spinner } from "../ui";

function notifyDone(title: string, message: string) {
  void chrome.runtime.sendMessage({ type: MSG.notifyDone, payload: { title, message } });
}

export function MentorPanel() {
  const { problem } = useProblem();
  const [revealed, setRevealed] = useState(0);
  const [hints, setHints] = useState<HintsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solution, setSolution] = useState<SolutionResponse | null>(null);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [armed, setArmed] = useState(false);

  if (!problem || (!problem.title && !problem.slug)) {
    return (
      <EmptyState
        emoji="🎯"
        title="Mentor mode"
        text="Open any LeetCode problem and I'll guide you with progressive hints — no solutions spoiled until you ask."
      />
    );
  }

  const reveal = async (level: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.hints(problem, level);
      setHints(result);
      setRevealed(level);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch hints");
    } finally {
      setLoading(false);
    }
  };

  const showSolution = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setSolutionLoading(true);
    setError(null);
    try {
      const result = await api.solution(problem);
      setSolution(result);
      notifyDone("LeetCoach", "Solution revealed — study the approach, not just the code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch solution");
    } finally {
      setSolutionLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card animate-fade-up">
        <h3 className="text-sm font-bold text-slate-100">Hint ladder</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {hints?.pattern
            ? `Detected pattern: ${hints.pattern.replace(/_/g, " ")}`
            : "Reveal hints one at a time — try solving between each."}
        </p>

        {error && <div className="mt-3"><ErrorBox message={error} onRetry={() => reveal(revealed)} /></div>}

        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((level) => {
            const hint = hints?.levels.find((h) => h.level === level);
            return (
              <div key={level}>
                {hint ? (
                  <div className="animate-pop rounded-lg border border-brand-400/30 bg-brand-500/10 p-3">
                    <div className="flex items-center gap-2">
                      <span className="chip bg-brand-500/25 text-brand-300">Level {level}</span>
                      <span className="text-xs font-semibold text-slate-200">{hint.title}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{hint.hint}</p>
                  </div>
                ) : level === revealed + 1 ? (
                  <button
                    className="btn-ghost w-full border-dashed"
                    disabled={loading}
                    onClick={() => void reveal(level)}
                  >
                    {loading ? <Spinner /> : "💡"} Reveal hint {level}
                  </button>
                ) : (
                  <div className="rounded-lg border border-dashed border-base-600/70 py-2.5 text-center text-[11px] text-slate-600">
                    🔒 Hint {level} locked — solve level {level - 1} first
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card animate-fade-up">
        <h3 className="text-sm font-bold text-slate-100">Stuck after all hints?</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Only press this when you've genuinely tried — it spoils the problem.
        </p>
        <button
          className={`mt-3 w-full ${armed ? "btn bg-rose-500 text-white hover:bg-rose-400" : "btn-ghost"}`}
          disabled={solutionLoading}
          onClick={() => void showSolution()}
        >
          {solutionLoading ? <Spinner /> : null}
          {armed ? "⚠️ Confirm — show the full solution" : "Show Solution"}
        </button>
        {!armed && (
          <p className="mt-2 text-center text-[10px] text-slate-600">
            You'll get one confirmation before anything is revealed.
          </p>
        )}
        {solution && (
          <div className="mt-3 space-y-3 animate-fade-up">
            <CodeBlock code={solution.solution} language={solution.language} />
            {solution.explanation && (
              <p className="text-xs leading-relaxed text-slate-400">{solution.explanation}</p>
            )}
            <button className="btn-ghost w-full text-xs" onClick={() => setSolution(null)}>
              Hide solution
            </button>
          </div>
        )}
      </div>

      {loading && !hints && (
        <div className="card">
          <Skeleton lines={3} />
        </div>
      )}
    </div>
  );
}
