import { useState } from "react";
import { api, getDeviceId } from "../api/client";
import { useAsync } from "../lib/useAsync";

export function SettingsPage() {
  const { data } = useAsync(() => api.health(), []);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const deviceId = getDeviceId();

  const saveProfile = async () => {
    if (!name.trim()) return;
    await api.updateProfile(name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Identity, backend status, and how data is stored.</p>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Profile</h3>
        <div className="flex gap-2">
          <input className="input max-w-xs" placeholder="Display name for the leaderboard" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary shrink-0" disabled={!name.trim()} onClick={() => void saveProfile()}>
            {saved ? "Saved ✓" : "Save"}
          </button>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Device ID</p>
          <code className="mt-1 block break-all rounded-lg bg-base-900 px-3 py-2 font-mono text-xs text-emerald-300">{deviceId}</code>
          <p className="mt-1 text-[11px] text-slate-600">
            Your progress is stored anonymously under this ID. The Chrome extension uses the same scheme.
          </p>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="text-sm font-bold text-slate-200">Backend</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full ${data?.status === "ok" ? "bg-emerald-400" : "bg-rose-400"}`} />
          <span className="text-slate-300">{data?.status === "ok" ? "Connected" : "Offline"}</span>
          <span className="text-slate-500">· v{data?.version ?? "—"}</span>
        </div>
        <p className="text-xs text-slate-500">
          AI provider: <span className="font-semibold text-brand-300">{data?.aiProvider ?? "unknown"}</span>
          {data?.aiProvider === "mock" && " (set GROQ_API_KEY in the backend .env to enable LLM mode)"}
        </p>
      </div>

      <div className="card space-y-2">
        <h3 className="text-sm font-bold text-slate-200">Privacy</h3>
        <p className="text-xs leading-relaxed text-slate-500">
          v1 stores everything under your anonymous device ID — no email, no account. Problem data you solve is
          stored in your local SQLite (or your own Supabase Postgres when configured). Firebase Auth support is
          on the roadmap so you can sync across devices.
        </p>
      </div>
    </div>
  );
}
