import { api } from "../api/client";
import { ActivityArea, DifficultyPie } from "../components/Charts";
import { Heatmap } from "../components/Heatmap";
import { StatCard } from "../components/StatCard";
import { TopicBars } from "../components/TopicBars";
import { useAsync } from "../lib/useAsync";

export function ProgressPage() {
  const { data, loading, error, refresh } = useAsync(() => api.progress(), []);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">Progress analytics</h1>
        <p className="page-sub">Streaks, heatmaps, topic strengths and solving patterns.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      ) : error ? (
        <p className="text-sm text-rose-400">{error}</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon="🔥" label="Current streak" value={`${data.streak} days`} accent="#f97316" />
            <StatCard icon="🏆" label="Longest streak" value={`${data.longestStreak} days`} accent="#fbbf24" />
            <StatCard icon="✅" label="Solved" value={`${data.solvedCount}`} accent="#34d399" />
            <StatCard icon="⏱️" label="Total time" value={`${Math.round(data.totalTimeMs / 60000)}m`} accent="#38bdf8" />
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-bold text-slate-200">90-day activity</h3>
            <Heatmap days={data.heatmap} />
            <div className="mt-6">
              <ActivityArea days={data.heatmap} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-4 text-sm font-bold text-slate-200">Topic mastery</h3>
              <TopicBars topics={data.topics} limit={10} />
            </div>
            <div className="card">
              <h3 className="mb-4 text-sm font-bold text-slate-200">Difficulty breakdown</h3>
              <DifficultyPie counts={data.difficultyCounts ?? {}} />
              <div className="mt-6">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Focus areas</h4>
                <div className="flex flex-wrap gap-1.5">
                  {data.weakTopics.map((t) => (
                    <span key={t} className="chip bg-rose-500/15 text-rose-300">
                      {t}
                    </span>
                  ))}
                  {data.strongTopics.map((t) => (
                    <span key={t} className="chip bg-emerald-500/15 text-emerald-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <button className="btn-ghost text-xs" onClick={refresh}>↻ Refresh</button>
    </div>
  );
}
