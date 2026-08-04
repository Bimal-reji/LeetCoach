import { useState } from "react";
import { api } from "../api/client";
import { useAsync } from "../lib/useAsync";

type Problem = { slug: string; leetcodeId: number | null; title: string; difficulty: string; tags: string[]; url: string };

const DIFF_STYLE: Record<string, string> = {
  Easy: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  Medium: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  Hard: "text-rose-400 bg-rose-500/10 border-rose-500/30",
};

export function ProblemsPage() {
  const { data, loading, error, refresh } = useAsync(() => api.problems(), []);
  const [filter, setFilter] = useState<string>("All");
  const [query, setQuery] = useState("");

  const problems = (data ?? []) as Problem[];
  const difficulties = ["All", "Easy", "Medium", "Hard"];
  const filtered = problems.filter(
    (p) =>
      (filter === "All" || p.difficulty === filter) &&
      (query === "" || p.title.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">Problem library</h1>
        <p className="page-sub">The curated knowledge base LeetCoach uses for recommendations.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input max-w-sm"
          placeholder="Search problems…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-1.5">
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === d ? "bg-brand-500/25 text-brand-300 ring-1 ring-brand-400/50" : "bg-base-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-rose-400">{error}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((p) => (
            <a
              key={p.slug}
              href={p.url || `https://leetcode.com/problems/${p.slug}/`}
              target="_blank"
              rel="noreferrer"
              className="card group flex items-start justify-between gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/50"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-100 group-hover:text-white">
                  {p.leetcodeId ? `${p.leetcodeId}. ` : ""}
                  {p.title}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.tags.slice(0, 4).map((t) => (
                    <span key={t} className="chip bg-base-700/70 text-slate-400">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <span className={`chip shrink-0 border ${DIFF_STYLE[p.difficulty] ?? ""}`}>{p.difficulty}</span>
            </a>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-slate-500">No problems match — open problems on LeetCode to grow the library.</p>
          )}
        </div>
      )}
      <button className="btn-ghost text-xs" onClick={refresh}>
        ↻ Refresh
      </button>
    </div>
  );
}
