/** Similar problems grouped by difficulty. */
import { api } from "../../shared/api";
import type { SimilarProblem } from "../../shared/types";
import { useProblem } from "../useProblem";
import { EmptyState, ErrorBox, Skeleton } from "../ui";
import { useAsync } from "../ui";

export function SimilarPanel() {
  const { problem } = useProblem();
  const { data, loading, error, refresh } = useAsync(
    () => (problem ? api.similar(problem) : Promise.reject(new Error("no problem"))),
    [problem?.slug, problem?.tags],
  );

  if (!problem) {
    return (
      <EmptyState
        emoji="📚"
        title="Similar problems"
        text="Open a problem and get hand-picked follow-ups at Easy, Medium and Hard to consolidate the pattern."
      />
    );
  }

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

  const groups: { key: "easy" | "medium" | "hard"; label: string; color: string }[] = [
    { key: "easy", label: "Easy", color: "#34d399" },
    { key: "medium", label: "Medium", color: "#fbbf24" },
    { key: "hard", label: "Hard", color: "#fb7185" },
  ];

  return (
    <div className="space-y-3">
      <div className="card animate-fade-up">
        <h3 className="text-sm font-bold text-slate-100">Practice the pattern</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Related problems for <span className="text-slate-300">{problem.title || problem.slug}</span> — climb
          the difficulty ladder.
        </p>
      </div>

      {groups.map((g) => (
        <div key={g.key} className="card animate-fade-up">
          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: g.color }}>
            {g.label} · {data[g.key].length}
          </h4>
          <ul className="mt-2 space-y-1.5">
            {data[g.key].length === 0 && <li className="text-[11px] text-slate-600">Nothing here yet.</li>}
            {data[g.key].map((p: SimilarProblem) => (
              <li key={p.slug}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-base-700/70"
                >
                  <span className="truncate text-xs text-slate-300 group-hover:text-white">{p.title}</span>
                  <span className="chip bg-base-700/70 text-slate-500 group-hover:text-brand-300">
                    {p.pattern.replace(/_/g, " ")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
