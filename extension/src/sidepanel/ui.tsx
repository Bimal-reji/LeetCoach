/** Small shared UI primitives used across the side panel. */
import { useEffect, useState, type ReactNode } from "react";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-400 border-t-transparent ${className}`}
      aria-label="Loading"
    />
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card border-rose-500/40 bg-rose-500/5 text-sm">
      <p className="font-semibold text-rose-400">Something went wrong</p>
      <p className="mt-1 text-slate-400">{message}</p>
      {onRetry && (
        <button className="btn-ghost mt-3 !py-1 text-xs" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  text,
  children,
}: {
  emoji: string;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 py-8 text-center animate-fade-up">
      <span className="text-3xl">{emoji}</span>
      <p className="font-semibold text-slate-200">{title}</p>
      <p className="max-w-[260px] text-xs text-slate-500">{text}</p>
      {children}
    </div>
  );
}

export function Section({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card animate-fade-up">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="group relative overflow-hidden rounded-lg border border-base-600/60 bg-base-900">
      <div className="flex items-center justify-between border-b border-base-600/40 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {language || "code"}
        </span>
        <button
          onClick={copy}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-white"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="scrollbar-thin max-h-72 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-emerald-200/90">
        {code}
      </pre>
    </div>
  );
}

export function Chip({
  children,
  color,
  className = "",
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`chip ${className}`}
      style={
        color
          ? { backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }
          : undefined
      }
    >
      {children}
    </span>
  );
}

export function DifficultyChip({ difficulty }: { difficulty: string }) {
  const color =
    difficulty === "Easy" ? "#34d399" : difficulty === "Medium" ? "#fbbf24" : difficulty === "Hard" ? "#fb7185" : "#64748b";
  return <Chip color={color}>{difficulty || "Unknown"}</Chip>;
}

/** Runs a promise and exposes loading/error/data with a refresh trigger. */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fn()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { data, loading, error, refresh };
}
