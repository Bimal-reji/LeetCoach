import type { HeatmapDay } from "@leetcoach/shared/types";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ActivityArea({ days }: { days: HeatmapDay[] }) {
  const data = days
    .filter((_, i) => i % 3 === 0)
    .map((d) => ({ date: d.date.slice(5), attempts: d.count }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: -24, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} interval={8} />
        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "#10131d", border: "1px solid #2a3248", borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: "#e2e8f0" }}
        />
        <Area type="monotone" dataKey="attempts" stroke="#8b5cf6" strokeWidth={2} fill="url(#activityFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const DIFF_COLORS: Record<string, string> = {
  Easy: "#34d399",
  Medium: "#fbbf24",
  Hard: "#fb7185",
};

export function DifficultyPie({ counts }: { counts: Record<string, number> }) {
  const data = Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">No solves yet — solve some problems to see the mix.</p>;
  }
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">
            {data.map((entry) => (
              <Cell key={entry.name} fill={DIFF_COLORS[entry.name] ?? "#64748b"} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: "#10131d", border: "1px solid #2a3248", borderRadius: 12, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DIFF_COLORS[d.name] ?? "#64748b" }} />
            <span className="text-slate-300">{d.name}</span>
            <span className="font-bold text-white">{d.value}</span>
            <span className="text-xs text-slate-500">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
