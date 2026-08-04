/** Interview mode: questions about the approach + scored feedback. */
import { useState } from "react";
import { api } from "../../shared/api";
import type { InterviewFeedback, InterviewResponse } from "../../shared/types";
import { useProblem } from "../useProblem";
import { EmptyState, ErrorBox, Spinner } from "../ui";

export function InterviewPanel() {
  const { problem } = useProblem();
  const [data, setData] = useState<InterviewResponse | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!problem) {
    return (
      <EmptyState
        emoji="🎤"
        title="Interview mode"
        text="Open a solved problem and get drilled like a real interviewer: why this approach, can it be optimized, what's the complexity?"
      />
    );
  }

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.interview(problem);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Interview request failed");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!active || !answer.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.interviewFeedback(problem, active, answer.trim());
      setFeedback(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback request failed");
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-3">
        <div className="card animate-fade-up">
          <h3 className="text-sm font-bold text-slate-100">Mock interview</h3>
          <p className="mt-1 text-xs text-slate-500">
            I'll ask the questions a real interviewer would follow up with. Answer out loud, then type your
            answer for scored feedback.
          </p>
          <button className="btn-primary mt-3 w-full" onClick={() => void start()} disabled={loading}>
            {loading ? <Spinner /> : "🎤"} Start interview
          </button>
        </div>
        {error && <ErrorBox message={error} onRetry={() => void start()} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.questions.map((q, i) => (
        <div key={q.id} className="card animate-fade-up">
          <div className="flex items-center justify-between">
            <span className="chip bg-brand-500/20 text-brand-300">Q{i + 1}</span>
            <button
              className="text-[11px] font-semibold text-slate-500 transition hover:text-brand-300"
              onClick={() => {
                setActive(q.id);
                setFeedback(null);
                setAnswer("");
              }}
            >
              {active === q.id ? "Answering…" : "Answer this"}
            </button>
          </div>
          <p className="mt-2 text-sm font-semibold leading-snug text-slate-100">{q.question}</p>
          {q.expectedPoints.length > 0 && (
            <ul className="mt-2 space-y-1">
              {q.expectedPoints.map((p, j) => (
                <li key={j} className="text-[11px] text-slate-500">
                  — {p}
                </li>
              ))}
            </ul>
          )}

          {active === q.id && (
            <div className="mt-3 animate-fade-up">
              <textarea
                className="input min-h-[80px] resize-y text-xs"
                placeholder="Type your spoken answer here for feedback…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
              <button className="btn-primary mt-2 w-full" onClick={() => void submit()} disabled={loading || !answer.trim()}>
                {loading ? <Spinner /> : "✓"} Get scored feedback
              </button>

              {feedback && (
                <div className="mt-3 rounded-lg border border-brand-400/30 bg-brand-500/10 p-3 animate-pop">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-extrabold text-brand-300">{feedback.score}/10</span>
                    <p className="text-xs font-semibold text-slate-200">{feedback.feedback}</p>
                  </div>
                  {feedback.whatToImprove.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {feedback.whatToImprove.map((item, j) => (
                        <li key={j} className="text-[11px] text-slate-400">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {feedback.sampleAnswer && (
                    <div className="mt-2 border-t border-base-600/50 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sample answer</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{feedback.sampleAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {error && <ErrorBox message={error} onRetry={() => void start()} />}
    </div>
  );
}
