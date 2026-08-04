import type { TopicStat } from "@leetcoach/shared/types";

export function TopicBars({ topics, limit = 8 }: { topics: TopicStat[]; limit?: number }) {
  const shown = topics.slice(0, limit);
  if (shown.length === 0) {
    return <p className="text-sm text-slate-500">No topic data yet — solve some problems!</p>;
  }
  return (
    <div className="space-y-3">
      {shown.map((t) => {
        const pct = Math.round(t.strength * 100);
        const color = t.strength >= 0.7 ? "#34d399" : t.strength >= 0.45 ? "#fbbf24" : "#fb7185";
        return (
          <div key={t.topic}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">{t.topic}</span>
              <span className="text-slate-500">
                {t.solved}/{t.attempted} solved · {Math.round(t.firstTryRate * 100)}% first try
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-base-700">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
