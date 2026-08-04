/** Personalized daily practice challenge. */
import { api } from "../../shared/api";
import { ErrorBox, Section, Skeleton } from "../ui";
import { useAsync } from "../ui";

export function DailyPanel() {
  const { data, loading, error, refresh } = useAsync(() => api.daily(), []);

  if (loading) {
    return (
      <div className="card">
        <Skeleton lines={5} />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorBox message={error ?? "Unknown error"} onRetry={refresh} />;
  }

  const problem = data.problem as { title?: string; difficulty?: string; tags?: string[]; url?: string };

  return (
    <div className="space-y-3">
      <div className="card animate-fade-up">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">📅 Daily challenge</h3>
          <span className="chip bg-brand-500/20 text-brand-300">{data.date}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">Personalized from your weak spots.</p>
      </div>

      <div className="card animate-fade-up">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-extrabold text-white">{problem.title ?? "Unknown"}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(problem.tags ?? []).map((t) => (
                <span key={t} className="chip bg-base-700/70 text-slate-400">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <span className="chip" style={{ color: problem.difficulty === "Easy" ? "#34d399" : problem.difficulty === "Medium" ? "#fbbf24" : "#fb7185" }}>
            {problem.difficulty}
          </span>
        </div>
        {problem.url && (
          <a
            href={problem.url}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-3 w-full"
          >
            Open problem ↗
          </a>
        )}
      </div>

      {data.focusTopics.length > 0 && (
        <Section title="Focus topics">
          <div className="flex flex-wrap gap-1.5">
            {data.focusTopics.map((t) => (
              <span key={t} className="chip bg-brand-500/15 text-brand-300">
                {t.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section title="Your plan">
        <ol className="space-y-2">
          {data.plan.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[9px] font-bold text-brand-300">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Section>

      <p className="text-center text-[10px] text-slate-600">New challenge every day — consistency beats intensity.</p>
    </div>
  );
}
