import { api } from "../api/client";
import type { LeaderboardEntry } from "@leetcoach/shared/types";
import { useAsync } from "../lib/useAsync";

const MEDALS = ["🥇", "🥈", "🥉"];

export function LeaderboardPage() {
  const { data, loading, error, refresh } = useAsync(() => api.leaderboard(50), []);
  const entries = (data ?? []) as LeaderboardEntry[];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">Leaderboard</h1>
        <p className="page-sub">Compete with everyone practicing through LeetCoach.</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-14 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-rose-400">{error}</p>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="divide-y divide-base-700/50">
            {entries.map((e, i) => (
              <div
                key={e.deviceId}
                className={`flex items-center gap-4 px-5 py-3.5 transition hover:bg-base-800/50 ${
                  i === 0 ? "bg-amber-500/5" : ""
                }`}
              >
                <span className="w-8 text-center text-lg font-bold text-slate-400">{MEDALS[i] ?? i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-100">{e.displayName}</p>
                  <p className="text-xs text-slate-500">
                    {e.solvedCount} solved · {e.streak} day streak
                  </p>
                </div>
                <span className="text-sm font-extrabold text-brand-300">{e.points} pts</span>
              </div>
            ))}
            {entries.length === 0 && <p className="px-5 py-8 text-center text-sm text-slate-500">No participants yet — be the first!</p>}
          </div>
        </div>
      )}
      <button className="btn-ghost text-xs" onClick={refresh}>↻ Refresh</button>
    </div>
  );
}
