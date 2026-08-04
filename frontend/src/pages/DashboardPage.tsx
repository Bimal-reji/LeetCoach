import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ActivityArea, DifficultyPie } from "../components/Charts";
import { Heatmap } from "../components/Heatmap";
import { StatCard } from "../components/StatCard";
import { TopicBars } from "../components/TopicBars";
import { useAsync } from "../lib/useAsync";

export function DashboardPage() {
  const { data, loading, error } = useAsync(() => api.progress(), []);
  const daily = useAsync(() => api.daily(), []);
  const board = useAsync(() => api.leaderboard(5), []);

  if (loading) {
    return (
      <div>
        <SkeletonTitle />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton mt-6 h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card border-rose-500/40">
        <p className="font-semibold text-rose-400">Backend unreachable</p>
        <p className="mt-1 text-sm text-slate-400">
          {error} — start the backend with <code className="text-brand-300">make dev-backend</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">Welcome back, Coder 👋</h1>
        <p className="page-sub">Here's how your DSA journey is shaping up.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="🔥" label="Day streak" value={`${data.streak}`} hint={`Best: ${data.longestStreak} days`} accent="#f97316" />
        <StatCard icon="✅" label="Problems solved" value={`${data.solvedCount}`} hint={`${data.attemptedCount} total attempts`} accent="#34d399" />
        <StatCard icon="⭐" label="Points" value={`${data.points}`} hint="Earn points for solves" accent="#8b5cf6" />
        <StatCard
          icon="⏱️"
          label="Time in practice"
          value={formatTime(data.totalTimeMs)}
          hint="Estimated solving time"
          accent="#38bdf8"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <h3 className="mb-4 text-sm font-bold text-slate-200">Practice activity</h3>
          <Heatmap days={data.heatmap} />
          <div className="mt-6">
            <ActivityArea days={data.heatmap} />
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h3 className="mb-4 text-sm font-bold text-slate-200">Topic strengths</h3>
            <TopicBars topics={data.topics} />
            {(data.weakTopics.length > 0 || data.strongTopics.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {data.weakTopics.map((t) => (
                  <span key={t} className="chip bg-rose-500/15 text-rose-300">weak: {t}</span>
                ))}
                {data.strongTopics.map((t) => (
                  <span key={t} className="chip bg-emerald-500/15 text-emerald-300">strong: {t}</span>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="mb-2 text-sm font-bold text-slate-200">Difficulty mix</h3>
            <DifficultyPie counts={data.difficultyCounts ?? {}} />
            <p className="mt-2 text-[11px] text-slate-600">Solved problems by difficulty.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {daily.data && (
          <div className="card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">📅 Today's challenge</h3>
              <span className="chip bg-brand-500/20 text-brand-300">{daily.data.date}</span>
            </div>
            <p className="mt-3 text-lg font-extrabold text-white">
              {String((daily.data.problem as { title?: string }).title ?? "Challenge")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {(daily.data.problem as { difficulty?: string }).difficulty} · focus:{" "}
              {daily.data.focusTopics.map((t) => t.replace(/_/g, " ")).join(", ") || "—"}
            </p>
            <Link to="/coach" className="btn-primary mt-4">
              Practice it →
            </Link>
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">🏆 Leaderboard top 5</h3>
            <Link to="/leaderboard" className="text-xs font-semibold text-brand-300 hover:text-brand-400">
              Full board →
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {(board.data ?? []).map((entry, i) => (
              <li key={entry.deviceId} className="flex items-center gap-3 rounded-xl bg-base-800/60 px-3 py-2">
                <span className={`w-5 text-center font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-600"}`}>
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-slate-200">{entry.displayName}</span>
                <span className="text-xs text-slate-500">{entry.solvedCount} solved</span>
                <span className="text-sm font-bold text-brand-300">{entry.points}</span>
              </li>
            ))}
            {(board.data ?? []).length === 0 && <p className="text-sm text-slate-500">No participants yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number): string {
  if (!ms) return "0m";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function SkeletonTitle() {
  return (
    <div className="mb-6 space-y-2">
      <div className="skeleton h-8 w-64" />
      <div className="skeleton h-4 w-96" />
    </div>
  );
}
