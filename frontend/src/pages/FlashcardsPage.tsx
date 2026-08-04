import { useState } from "react";
import { api } from "../api/client";
import type { Flashcard } from "@leetcoach/shared/types";
import { useAsync } from "../lib/useAsync";

export function FlashcardsPage() {
  const { data, loading, error, refresh } = useAsync(() => api.listFlashcards(false), []);
  const [flipped, setFlipped] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const cards = (data ?? []) as Flashcard[];

  const review = async (card: Flashcard, recalled: boolean) => {
    setBusy(card.id ?? null);
    try {
      await api.reviewFlashcard(card.id!, recalled);
      setFlipped(null);
      refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="page-title">Flashcards</h1>
        <p className="page-sub">Spaced repetition for DSA — generate cards from solved problems in the extension.</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-48 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-rose-400">{error}</p>
      ) : cards.length === 0 ? (
        <div className="card py-16 text-center">
          <span className="text-5xl">🃏</span>
          <p className="mt-4 font-semibold text-slate-200">No flashcards yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Open the extension on a solved LeetCode problem and hit "Generate flashcards".
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <div key={card.id} className="flex flex-col">
              <button
                onClick={() => setFlipped(flipped === card.id ? null : (card.id ?? null))}
                className="card flex min-h-[180px] flex-1 items-center justify-center text-center transition-all duration-200 hover:-translate-y-1 hover:border-brand-400/50"
                style={{ perspective: 800 }}
              >
                {flipped === card.id ? (
                  <p className="text-sm leading-relaxed text-slate-200">{card.answer}</p>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-brand-300">BOX {card.box}</p>
                    <p className="mt-2 font-semibold text-slate-100">{card.question}</p>
                  </div>
                )}
              </button>
              {flipped === card.id && (
                <div className="mt-2 flex gap-2 animate-pop">
                  <button className="btn-ghost flex-1 !py-1.5 text-xs !text-rose-300" disabled={busy === card.id} onClick={() => void review(card, false)}>
                    😅 Again
                  </button>
                  <button
                    className="btn flex-1 !py-1.5 text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    disabled={busy === card.id}
                    onClick={() => void review(card, true)}
                  >
                    ✅ Good
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
