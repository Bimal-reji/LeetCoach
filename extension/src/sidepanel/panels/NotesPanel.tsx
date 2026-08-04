/** Revision notes + AI-generated flashcards in one panel. */
import { useState } from "react";
import { api } from "../../shared/api";
import type { Flashcard, Note } from "../../shared/types";
import { useProblem } from "../useProblem";
import { EmptyState, ErrorBox, Skeleton, Spinner } from "../ui";
import { useAsync } from "../ui";

type View = "notes" | "cards";

export function NotesPanel() {
  const { problem } = useProblem();
  const [view, setView] = useState<View>("notes");

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {(
          [
            { id: "notes", label: "📝 Notes" },
            { id: "cards", label: "🃏 Flashcards" },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
              view === v.id ? "bg-brand-500/25 text-brand-300 ring-1 ring-brand-400/50" : "bg-base-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {view === "notes" ? <NotesView problemSlug={problem?.slug} /> : <FlashcardsView problemSlug={problem?.slug} />}
    </div>
  );
}

function NotesView({ problemSlug }: { problemSlug?: string }) {
  const { data, loading, error, refresh } = useAsync(() => api.listNotes(problemSlug), [problemSlug]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await api.createNote({
        problemSlug,
        title: title.trim() || problemSlug || "General note",
        body: body.trim(),
        tags: [],
      });
      setBody("");
      setTitle("");
      refresh();
    } catch {
      /* surfaced via refresh */
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="card animate-fade-up">
        <h3 className="text-sm font-bold text-slate-100">Capture the insight</h3>
        <input className="input mt-2 text-xs" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          className="input mt-2 min-h-[70px] resize-y text-xs"
          placeholder="Observation, pattern, or mistake worth revising…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn-primary mt-2 w-full" onClick={() => void save()} disabled={saving || !body.trim()}>
          {saving ? <Spinner /> : "💾"} Save note
        </button>
      </div>

      {loading ? (
        <div className="card"><Skeleton lines={3} /></div>
      ) : error ? (
        <ErrorBox message={error} onRetry={refresh} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState emoji="🗒️" title="No notes yet" text="Save your observations and they'll appear here for revision." />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((n: Note) => (
            <div key={n.id} className="card animate-fade-up !p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold text-slate-200">{n.title}</p>
                <button
                  className="text-[10px] text-slate-600 transition hover:text-rose-400"
                  onClick={async () => {
                    await api.deleteNote(n.id!);
                    refresh();
                  }}
                >
                  ✕
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-400">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FlashcardsView({ problemSlug }: { problemSlug?: string }) {
  const { data, loading, error, refresh } = useAsync(() => api.listFlashcards(false), []);
  const [generating, setGenerating] = useState(false);
  const [flipped, setFlipped] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const generate = async () => {
    if (!problemSlug) return;
    setGenerating(true);
    try {
      await api.generateFlashcards(problemSlug, 4);
      refresh();
    } catch {
      /* ignore */
    } finally {
      setGenerating(false);
    }
  };

  const review = async (card: Flashcard, recalled: boolean) => {
    setBusyId(card.id ?? null);
    try {
      await api.reviewFlashcard(card.id!, recalled);
      setFlipped(null);
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const cards = (data ?? []).filter((c) => !problemSlug || c.problemSlug === problemSlug);

  return (
    <>
      {problemSlug && (
        <button className="btn-ghost w-full" onClick={() => void generate()} disabled={generating}>
          {generating ? <Spinner /> : "✨"} Generate flashcards from this problem
        </button>
      )}

      {loading ? (
        <div className="card mt-3"><Skeleton lines={3} /></div>
      ) : error ? (
        <ErrorBox message={error} onRetry={refresh} />
      ) : cards.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            emoji="🃏"
            title="No flashcards yet"
            text="Generate cards from a solved problem to lock in the key insights with spaced repetition."
          />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {cards.map((card) => (
            <div key={card.id}>
              <button
                onClick={() => setFlipped(flipped === card.id ? null : (card.id ?? null))}
                className="card w-full text-left animate-fade-up !p-3"
                style={{ minHeight: 84 }}
              >
                {flipped === card.id ? (
                  <p className="text-xs leading-relaxed text-slate-200">{card.answer}</p>
                ) : (
                  <p className="text-xs font-semibold leading-snug text-slate-100">{card.question}</p>
                )}
              </button>
              {flipped === card.id && (
                <div className="mt-1 flex gap-2 animate-pop">
                  <button
                    className="btn-ghost flex-1 !py-1 text-xs !text-rose-300"
                    disabled={busyId === card.id}
                    onClick={() => void review(card, false)}
                  >
                    😅 Again
                  </button>
                  <button
                    className="btn flex-1 !py-1 text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    disabled={busyId === card.id}
                    onClick={() => void review(card, true)}
                  >
                    ✅ Good (box {card.box ?? 0} → {(card.box ?? 0) + 1})
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
