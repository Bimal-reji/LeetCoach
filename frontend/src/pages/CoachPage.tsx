import { useState } from "react";
import { api } from "../api/client";
import type { ExtractedProblem } from "@leetcoach/shared/types";

type Tool = "hints" | "pattern" | "complexity" | "debug" | "review" | "explain" | "interview";

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: "hints", label: "Hints", icon: "💡" },
  { id: "pattern", label: "Pattern", icon: "🧩" },
  { id: "complexity", label: "Complexity", icon: "⚡" },
  { id: "debug", label: "Debug", icon: "🐞" },
  { id: "review", label: "Review", icon: "🔍" },
  { id: "explain", label: "Explain", icon: "📖" },
  { id: "interview", label: "Interview", icon: "🎤" },
];

const emptyProblem = (): ExtractedProblem => ({
  slug: "",
  leetcodeId: null,
  title: "",
  difficulty: "Medium",
  tags: [],
  description: "",
  examples: [],
  constraints: [],
  functionSignature: null,
  url: "",
  language: "python",
  code: "",
});

export function CoachPage() {
  const [problem, setProblem] = useState<ExtractedProblem>(emptyProblem());
  const [tool, setTool] = useState<Tool>("hints");
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<ExtractedProblem>) => setProblem((p) => ({ ...p, ...patch }));

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (tool) {
        case "hints":
          setResult(await api.hints(problem, 3));
          break;
        case "pattern":
          setResult(await api.pattern(problem));
          break;
        case "complexity":
          setResult(await api.complexity(problem));
          break;
        case "debug":
          setResult(await api.debug(problem, problem.description.includes("error") ? problem.description : "Wrong Answer"));
          break;
        case "review":
          setResult(await api.review(problem));
          break;
        case "explain":
          setResult(await api.explain(problem, "intermediate"));
          break;
        case "interview":
          setResult(await api.interview(problem));
          break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">AI Coach</h1>
        <p className="page-sub">Paste a problem (or use the extension on LeetCode) and train without spoilers.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Problem form */}
        <div className="card space-y-3">
          <h3 className="text-sm font-bold text-slate-200">1 · Describe the problem</h3>
          <input className="input" placeholder="Problem title (e.g. Two Sum)" value={problem.title} onChange={(e) => set({ title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={problem.difficulty} onChange={(e) => set({ difficulty: e.target.value as ExtractedProblem["difficulty"] })}>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
            <select className="input" value={problem.language} onChange={(e) => set({ language: e.target.value })}>
              {["python", "javascript", "typescript", "java", "cpp", "csharp", "go", "rust"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <input className="input" placeholder="Tags, comma-separated (Array, Hash Table)" value={problem.tags.join(", ")} onChange={(e) => set({ tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          <textarea className="input min-h-[90px]" placeholder="Problem description…" value={problem.description} onChange={(e) => set({ description: e.target.value })} />
          <textarea className="input min-h-[140px] font-mono text-xs" placeholder="Your code…" value={problem.code} onChange={(e) => set({ code: e.target.value })} />

          <div className="flex flex-wrap gap-1.5">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTool(t.id);
                  setResult(null);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  tool === t.id ? "bg-brand-500/25 text-brand-300 ring-1 ring-brand-400/50" : "bg-base-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full" onClick={() => void run()} disabled={loading}>
            {loading ? "Thinking…" : "🚀 Run tool"}
          </button>
        </div>

        {/* Result */}
        <div className="card min-h-[400px]">
          <h3 className="text-sm font-bold text-slate-200">2 · {TOOLS.find((t) => t.id === tool)?.label}</h3>
          <div className="mt-4 space-y-3">
            {error && <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</p>}
            {loading && <div className="skeleton h-40 rounded-2xl" />}
            {result != null && <ResultView tool={tool} result={result} />}
            {!result && !loading && !error && (
              <p className="text-sm text-slate-500">Fill the form, pick a tool, and hit run.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultView({ tool, result }: { tool: Tool; result: unknown }) {
  const r = result as Record<string, unknown>;
  if (tool === "hints") {
    const levels = (r.levels ?? []) as { level: number; title: string; hint: string }[];
    return (
      <div className="space-y-2">
        {levels.map((l) => (
          <div key={l.level} className="rounded-xl border border-brand-400/30 bg-brand-500/10 p-4">
            <p className="text-xs font-bold text-brand-300">Level {l.level} · {l.title}</p>
            <p className="mt-1 text-sm text-slate-300">{l.hint}</p>
          </div>
        ))}
      </div>
    );
  }
  if (tool === "pattern") {
    const p = r.primary as { name: string; confidence: number; reason: string };
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧩</span>
          <div>
            <p className="text-lg font-extrabold text-white">{p.name}</p>
            <p className="text-xs text-slate-500">{Math.round((p.confidence ?? 0) * 100)}% confidence</p>
          </div>
        </div>
        <p className="text-sm text-slate-300">{p.reason}</p>
        <p className="text-sm text-slate-400">{String(r.explanation ?? "")}</p>
        <p className="text-xs text-slate-500">When to use: {String(r.whenToUse ?? "")}</p>
      </div>
    );
  }
  if (tool === "complexity") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-base-800 p-4">
            <p className="text-xs text-slate-500">Time</p>
            <p className="font-mono text-xl font-bold text-brand-300">{String(r.timeComplexity)}</p>
          </div>
          <div className="rounded-xl bg-base-800 p-4">
            <p className="text-xs text-slate-500">Space</p>
            <p className="font-mono text-xl font-bold text-sky-300">{String(r.spaceComplexity)}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400">{String(r.explanation)}</p>
        <ul className="space-y-1.5">
          {(r.optimizations as string[] ?? []).map((o, i) => (
            <li key={i} className="text-sm text-slate-300">▸ {o}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (tool === "debug" || tool === "review") {
    return <JsonBlock result={result} />;
  }
  if (tool === "explain") {
    const lines = (r.lines ?? []) as { line: number; code: string; explanation: string }[];
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-300">{String(r.overview)}</p>
        {lines.map((l) => (
          <div key={l.line} className="rounded-lg bg-base-900 p-3">
            <code className="font-mono text-xs text-emerald-300">{l.code}</code>
            <p className="mt-1 text-xs text-slate-400">{l.explanation}</p>
          </div>
        ))}
      </div>
    );
  }
  if (tool === "interview") {
    const questions = (r.questions ?? []) as { id: string; question: string; expectedPoints: string[] }[];
    return (
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-base-600 bg-base-800/60 p-4">
            <p className="text-sm font-semibold text-slate-100">Q{i + 1}: {q.question}</p>
            <ul className="mt-2 space-y-1">
              {q.expectedPoints.map((p, j) => (
                <li key={j} className="text-xs text-slate-500">— {p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }
  return <JsonBlock result={result} />;
}

function JsonBlock({ result }: { result: unknown }) {
  return (
    <pre className="scrollbar-thin max-h-[420px] overflow-auto rounded-xl bg-base-900 p-4 font-mono text-xs leading-relaxed text-slate-300">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
