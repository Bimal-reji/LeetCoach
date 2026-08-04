import type { HeatmapDay } from "@leetcoach/shared/types";

/** GitHub-style 90-day contribution heatmap. */
export function Heatmap({ days }: { days: HeatmapDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const colorFor = (count: number) => {
    if (count === 0) return "rgba(42,50,72,0.6)";
    const intensity = Math.min(1, count / max);
    const alpha = 0.35 + intensity * 0.65;
    return `rgba(139,92,246,${alpha.toFixed(2)})`;
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} attempt${day.count === 1 ? "" : "s"}`}
                className="h-3 w-3 rounded-[3px] transition-transform hover:scale-125"
                style={{ backgroundColor: colorFor(day.count) }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <span key={v} className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: colorFor(v * max) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
