/** Time/space complexity analysis of the user's current code. */
import { api } from "../../shared/api";
import { useProblem } from "../useProblem";
import { EmptyState, ErrorBox, Section, Skeleton } from "../ui";
import { useAsync } from "../ui";

export function ComplexityPanel() {
  const { problem } = useProblem();
  const { data, loading, error, refresh } = useAsync(
    () => (problem ? api.complexity(problem) : Promise.reject(new Error("no problem"))),
    [problem?.slug, problem?.code],
  );

  if (!problem) {
    return (
      <EmptyState
        emoji="⚡"
        title="Complexity analyzer"
        text="Open a problem and write some code — I'll estimate time & space complexity and suggest optimizations."
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Section title="Time">
          <p className="font-mono text-xl font-bold text-brand-300">{data.timeComplexity}</p>
        </Section>
        <Section title="Space">
          <p className="font-mono text-xl font-bold text-accent-sky">{data.spaceComplexity}</p>
        </Section>
      </div>

      <Section title="How we estimated it">
        <p className="text-xs leading-relaxed text-slate-300">{data.explanation}</p>
      </Section>

      <Section title="Optimization opportunities">
        <ul className="space-y-2">
          {data.optimizations.map((opt, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
              <span className="mt-0.5 text-emerald-400">▸</span>
              {opt}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
