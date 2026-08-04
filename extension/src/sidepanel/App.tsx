/** LeetCoach side panel shell: header, activity rail, panel content. */
import { useEffect, useState } from "react";
import { api } from "../shared/api";
import { MSG } from "../shared/constants";
import { useProblem } from "./useProblem";
import { ChatPanel } from "./panels/ChatPanel";
import { ComplexityPanel } from "./panels/ComplexityPanel";
import { DailyPanel } from "./panels/DailyPanel";
import { DebugPanel } from "./panels/DebugPanel";
import { ExplainPanel } from "./panels/ExplainPanel";
import { InterviewPanel } from "./panels/InterviewPanel";
import { MentorPanel } from "./panels/MentorPanel";
import { NotesPanel } from "./panels/NotesPanel";
import { PatternPanel } from "./panels/PatternPanel";
import { ReviewPanel } from "./panels/ReviewPanel";
import { SimilarPanel } from "./panels/SimilarPanel";
import { EmptyState, Spinner } from "./ui";

type TabId =
  | "hints"
  | "pattern"
  | "complexity"
  | "debug"
  | "review"
  | "explain"
  | "interview"
  | "similar"
  | "daily"
  | "notes"
  | "chat";

interface TabDef {
  id: TabId;
  icon: string;
  label: string;
  needsProblem: boolean;
}

const TABS: TabDef[] = [
  { id: "hints", icon: "🎯", label: "Mentor", needsProblem: true },
  { id: "pattern", icon: "🧩", label: "Pattern", needsProblem: true },
  { id: "complexity", icon: "⚡", label: "Complexity", needsProblem: true },
  { id: "debug", icon: "🐞", label: "Debug", needsProblem: true },
  { id: "review", icon: "🔍", label: "Review", needsProblem: true },
  { id: "explain", icon: "📖", label: "Explain", needsProblem: true },
  { id: "interview", icon: "🎤", label: "Interview", needsProblem: true },
  { id: "similar", icon: "📚", label: "Similar", needsProblem: true },
  { id: "daily", icon: "📅", label: "Daily", needsProblem: false },
  { id: "notes", icon: "📝", label: "Notes", needsProblem: false },
  { id: "chat", icon: "💬", label: "Chat", needsProblem: false },
];

interface HealthState {
  ok: boolean;
  label: string;
}

export function App() {
  const { problem, ready } = useProblem();
  const [tab, setTab] = useState<TabId>("hints");
  const [health, setHealth] = useState<HealthState>({ ok: false, label: "checking…" });
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);

  // Record a solve so the revision dashboard / streak / leaderboard stay alive.
  const markSolved = async () => {
    if (!problem || recorded) return;
    setRecording(true);
    try {
      await api.upsertProblem(problem, "accepted", false, null);
      setRecorded(true);
      void chrome.runtime.sendMessage({ type: MSG.notifyDone, payload: { title: "LeetCoach", message: "Solved — recorded to your progress!" } });
    } catch {
      /* backend offline — silently ignore; user can retry */
    } finally {
      setRecording(false);
    }
  };

  const hasProblem = Boolean(problem && (problem.title || problem.slug));

  // Default to Chat when no problem is detected.
  useEffect(() => {
    if (ready && !hasProblem && tab !== "chat" && tab !== "daily" && tab !== "notes") {
      setTab("chat");
    }
  }, [ready, hasProblem, tab]);

  // Backend health poll.
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const h = await api.health();
        if (alive) setHealth({ ok: true, label: h.aiProvider === "mock" ? "offline AI" : "Groq AI" });
      } catch {
        if (alive) setHealth({ ok: false, label: "offline" });
      }
    };
    void check();
    const timer = setInterval(check, 20000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const openSettings = () => chrome.runtime.openOptionsPage();

  return (
    <div className="flex h-screen flex-col bg-base-950 text-slate-100">
      {/* Header */}
      <header className="flex items-center gap-2 border-b border-base-700/60 bg-base-900/80 px-3 py-2 backdrop-blur">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 text-sm font-black text-white shadow-glow">
          L
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-extrabold tracking-tight">LeetCoach AI</h1>
          <p className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${health.ok ? "bg-emerald-400" : "bg-rose-400"}`}
            />
            {health.label}
          </p>
        </div>
        <button
          onClick={openSettings}
          title="Settings"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-base-700 hover:text-white"
        >
          ⚙️
        </button>
      </header>

      {/* Problem banner */}
      <div className="border-b border-base-700/50 bg-base-900/40 px-3 py-2">
        {hasProblem ? (
          <div className="animate-fade-up">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-bold text-slate-100" title={problem!.title}>
                {problem!.title || problem!.slug}
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                {recorded ? (
                  <span className="chip bg-emerald-500/15 text-emerald-300">✓ recorded</span>
                ) : (
                  <button
                    onClick={() => void markSolved()}
                    disabled={recording}
                    title="Record this solve in your progress dashboard"
                    className="chip bg-emerald-500/15 text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    {recording ? "…" : "✓ Solved"}
                  </button>
                )}
                <DifficultyChip difficulty={problem!.difficulty} />
              </div>
            </div>
            {problem!.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {problem!.tags.slice(0, 5).map((t) => (
                  <span key={t} className="chip bg-base-700/70 text-slate-400">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">Open a LeetCode problem to coach it 🚀</p>
        )}
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Activity rail */}
        <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-base-700/50 bg-base-900/60 py-2">
          {TABS.map((t) => {
            const disabled = t.needsProblem && !hasProblem;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                title={`${t.label}${disabled ? " (needs a problem)" : ""}`}
                disabled={disabled}
                onClick={() => setTab(t.id)}
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-base transition-all duration-150 ${
                  active
                    ? "bg-brand-500/20 ring-1 ring-brand-400/50"
                    : disabled
                      ? "opacity-30"
                      : "hover:bg-base-700"
                }`}
              >
                <span className="text-base leading-none">{t.icon}</span>
                {active && <span className="absolute -left-1 h-5 w-0.5 rounded-full bg-brand-400" />}
              </button>
            );
          })}
        </nav>

        {/* Panel content */}
        <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto p-3">
          {!ready ? (
            <div className="mt-6 flex justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : (
            <PanelContent tab={tab} />
          )}
        </main>
      </div>
    </div>
  );
}

function DifficultyChip({ difficulty }: { difficulty: string }) {
  const color =
    difficulty === "Easy" ? "#34d399" : difficulty === "Medium" ? "#fbbf24" : difficulty === "Hard" ? "#fb7185" : "#64748b";
  return (
    <span
      className="chip shrink-0"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {difficulty || "Unknown"}
    </span>
  );
}

function PanelContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case "hints":
      return <MentorPanel />;
    case "pattern":
      return <PatternPanel />;
    case "complexity":
      return <ComplexityPanel />;
    case "debug":
      return <DebugPanel />;
    case "review":
      return <ReviewPanel />;
    case "explain":
      return <ExplainPanel />;
    case "interview":
      return <InterviewPanel />;
    case "similar":
      return <SimilarPanel />;
    case "daily":
      return <DailyPanel />;
    case "notes":
      return <NotesPanel />;
    case "chat":
      return <ChatPanel />;
    default:
      return <EmptyState emoji="🤷" title="Nothing here" text="Pick a tool from the rail." />;
  }
}

// Re-export helper so panels can open the side panel's chat from elsewhere.
export function openSidePanel() {
  void chrome.runtime.sendMessage({ type: MSG.openSidePanel });
}
