/** Dashboard shell: sidebar navigation + routed pages. */
import { NavLink, Route, Routes } from "react-router-dom";
import { ChatPage } from "./pages/ChatPage";
import { CoachPage } from "./pages/CoachPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FlashcardsPage } from "./pages/FlashcardsPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { NotesPage } from "./pages/NotesPage";
import { ProblemsPage } from "./pages/ProblemsPage";
import { ProgressPage } from "./pages/ProgressPage";
import { SettingsPage } from "./pages/SettingsPage";

const NAV = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/problems", label: "Problems", icon: "🗂️" },
  { to: "/coach", label: "AI Coach", icon: "🎯" },
  { to: "/progress", label: "Progress", icon: "📈" },
  { to: "/chat", label: "Chat", icon: "💬" },
  { to: "/flashcards", label: "Flashcards", icon: "🃏" },
  { to: "/notes", label: "Notes", icon: "📝" },
  { to: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

export function App() {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-16 flex-col items-center gap-1 border-r border-base-700/60 bg-base-900/70 py-4 backdrop-blur lg:w-56 lg:items-stretch lg:px-4">
        <div className="mb-4 flex items-center gap-2.5 px-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-base font-black text-white shadow-glow">
            L
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-extrabold tracking-tight">LeetCoach</p>
            <p className="text-[10px] text-slate-500">AI for DSA</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-brand-500/20 text-brand-300 ring-1 ring-brand-400/40"
                    : "text-slate-400 hover:bg-base-800 hover:text-slate-200"
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden rounded-xl border border-base-700/60 bg-base-850 p-3 lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tip</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Use the Chrome extension on leetcode.com for in-problem coaching.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 lg:pl-56">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/coach" element={<CoachPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
