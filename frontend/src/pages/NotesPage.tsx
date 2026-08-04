import { useState } from "react";
import { api } from "../api/client";
import type { Revision } from "@leetcoach/shared/types";
import { useAsync } from "../lib/useAsync";

export function NotesPage() {
  const notes = useAsync(() => api.listNotes(), []);
  const revisions = useAsync(() => api.listRevisions(), []);
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<Revision["kind"]>("observation");
  const [saving, setSaving] = useState(false);

  const saveRevision = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await api.createRevision({ kind, content: content.trim() });
      setContent("");
      revisions.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">Notes & Revision</h1>
        <p className="page-sub">Capture observations, patterns, and mistakes — then revisit them.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Add a revision entry</h3>
          <div className="flex gap-1.5">
            {(["observation", "pattern", "mistake", "tip"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  kind === k ? "bg-brand-500/25 text-brand-300 ring-1 ring-brand-400/50" : "bg-base-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <textarea className="input min-h-[110px]" placeholder="What did you learn today?" value={content} onChange={(e) => setContent(e.target.value)} />
          <button className="btn-primary w-full" disabled={saving || !content.trim()} onClick={() => void saveRevision()}>
            💾 Save
          </button>

          <div className="pt-4">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Recent revisions</h4>
            <div className="space-y-2">
              {((revisions.data ?? []) as Revision[]).slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-start gap-2 rounded-xl bg-base-800/60 p-3">
                  <span className="chip shrink-0 bg-brand-500/15 text-brand-300">{r.kind}</span>
                  <p className="text-xs leading-relaxed text-slate-300">{r.content}</p>
                  <button className="ml-auto text-slate-600 hover:text-rose-400" onClick={async () => { await api.deleteRevision(r.id!); revisions.refresh(); }}>
                    ✕
                  </button>
                </div>
              ))}
              {((revisions.data ?? []) as Revision[]).length === 0 && (
                <p className="text-sm text-slate-500">Nothing yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 text-sm font-bold text-slate-200">Problem notes</h3>
          <div className="space-y-3">
            {((notes.data ?? []) as { id: number; title: string; body: string }[]).map((n) => (
              <div key={n.id} className="rounded-xl border border-base-600/60 bg-base-800/50 p-4">
                <p className="text-sm font-semibold text-slate-200">{n.title}</p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{n.body}</p>
              </div>
            ))}
            {((notes.data ?? []) as unknown[]).length === 0 && (
              <p className="text-sm text-slate-500">Notes saved from the extension appear here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
