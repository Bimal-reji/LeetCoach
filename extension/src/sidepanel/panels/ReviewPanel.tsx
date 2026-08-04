/** Code review: naming, readability, optimization, duplication, dead code. */
import { api } from "../../shared/api";
import { useProblem } from "../useProblem";
import { EmptyState, ErrorBox, Section, Skeleton } from "../ui";
import { useAsync } from "../ui";

const SEVERITY_STYLES: Record<string, { color: string; label: string }> = {
  critical: { color: "#fb7185", label: "Critical" },
  warning: { color: "#fbbf24", label: "Warning" },
  info: { color: "#38bdf8", label: "Info" },
};

export function ReviewPanel() {
  const { problem } = useProblem();
  const { data, loading, error, refresh } = useAsync(
    () => (problem ? api.review(problem) : Promise.reject(new Error("no problem"))),
    [problem?.slug, problem?.code],
  );

  if (!problem) {
    return (
      <EmptyState
        emoji="🔍"
        title="Code review"
        text="Open a problem with your code written — get a mentor-style review of naming, clarity, memory and correctness."
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
      <div className="card animate-fade-up">
        <div className="flex items-center gap-3">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-extrabold"
            style={{
              backgroundColor: data.rating >= 8 ? "#34d39922" : data.rating >= 5 ? "#fbbf2422" : "#fb718522",
              color: data.rating >= 8 ? "#34d399" : data.rating >= 5 ? "#fbbf24" : "#fb7185",
              border: "1px solid currentColor",
            }}
          >
            {data.rating}/10
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Code review</h3>
            <p className="mt-0.5 text-xs text-slate-400">{data.summary}</p>
          </div>
        </div>
      </div>

      <Section title="Findings" subtitle={`${data.findings.length} items`}>
        <div className="space-y-2">
          {data.findings.map((f, i) => {
            const style = SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.info;
            return (
              <div key={i} className="rounded-lg border border-base-600/50 bg-base-800/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="chip" style={{ color: style.color, backgroundColor: `${style.color}18` }}>
                    {style.label} · {f.category}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-200">{f.message}</p>
                {f.suggestion && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">💡 {f.suggestion}</p>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
