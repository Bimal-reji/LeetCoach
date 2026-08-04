/** Auto-detected algorithm pattern with rationale. */
import { api } from "../../shared/api";
import { useProblem } from "../useProblem";
import { EmptyState, ErrorBox, Section, Skeleton } from "../ui";
import { useAsync } from "../ui";

export function PatternPanel() {
  const { problem } = useProblem();

  const { data, loading, error, refresh } = useAsync(
    () => (problem ? api.pattern(problem) : Promise.reject(new Error("no problem"))),
    [problem?.slug, problem?.code],
  );

  if (!problem) {
    return (
      <EmptyState
        emoji="🧩"
        title="Pattern detection"
        text="Open a problem to see which algorithmic pattern fits — and exactly why."
      />
    );
  }

  if (loading) {
    return (
      <div className="card">
        <Skeleton lines={4} />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorBox message={error ?? "Unknown error"} onRetry={refresh} />;
  }

  const confidence = Math.round(data.primary.confidence * 100);

  return (
    <div className="space-y-3">
      <Section title="Primary pattern" subtitle="Detected automatically from the problem text">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20 text-2xl ring-1 ring-brand-400/40">
            🧩
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold text-white">{data.primary.name}</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-base-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-700"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">{confidence}% confidence</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-300">{data.primary.reason}</p>
      </Section>

      {data.alternatives.length > 0 && (
        <Section title="Alternatives to keep in mind">
          <div className="space-y-2">
            {data.alternatives.map((alt) => (
              <div key={alt.key} className="flex items-start gap-2 rounded-lg bg-base-800/70 p-2.5">
                <span className="chip bg-base-700 text-slate-300">{alt.name}</span>
                <p className="text-[11px] leading-snug text-slate-500">{alt.reason}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Why this pattern">
        <p className="text-xs leading-relaxed text-slate-300">{data.explanation}</p>
      </Section>

      <Section title="When to use it">
        <p className="text-xs leading-relaxed text-slate-300">{data.whenToUse}</p>
      </Section>
    </div>
  );
}
