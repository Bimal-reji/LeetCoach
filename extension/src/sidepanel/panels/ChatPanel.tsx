/** Conversational mentor — streams replies, handles right-click selections. */
import { useEffect, useRef, useState } from "react";
import { streamChat } from "../../shared/api";
import type { ChatMessage } from "../../shared/types";
import { useProblem } from "../useProblem";

const QUICK_PROMPTS = [
  "Explain DP like I'm 12",
  "How do I approach binary search?",
  "Hint please",
  "What's the difference between DFS and BFS?",
  "Explain recursion",
];

export function ChatPanel() {
  const { problem, pendingSelection, clearSelection } = useProblem();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Handle context-menu selections (Ask / Explain / Review selected code).
  useEffect(() => {
    if (!pendingSelection) return;
    const prefix =
      pendingSelection.mode === "explain"
        ? "Explain this selected code:\n"
        : pendingSelection.mode === "review"
          ? "Review this selected code:\n"
          : "Context from my selection:\n";
    void send(`${prefix}\`\`\`\n${pendingSelection.text}\n\`\`\``);
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSelection]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Abort any in-flight stream when the panel unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput("");
    setError(null);

    const history = messages.slice(-12);
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let full = "";
      for await (const chunk of streamChat(trimmed, history, problem, controller.signal)) {
        if (chunk.error) {
          setError(chunk.error);
          break;
        }
        full += chunk.delta;
        setMessages((m) => {
          const next = [...m];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: full };
          return next;
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Chat failed");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="card animate-fade-up">
              <h3 className="text-sm font-bold text-slate-100">💬 LeetCoach Chat</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Ask about DSA concepts or your current problem
                {problem && (problem.title || problem.slug)
                  ? ` (${problem.title || problem.slug})`
                  : ""}{" "}
                — without leaving LeetCode.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => void send(p)}
                  className="chip bg-base-800 text-slate-300 transition hover:bg-brand-500/20 hover:text-brand-300"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-600 text-white"
                  : "border border-base-600/60 bg-base-850 text-slate-200"
              }`}
            >
              {m.content || (m.role === "assistant" && streaming ? <TypingDots /> : null)}
            </div>
          </div>
        ))}

        {error && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] text-rose-400">{error}</p>
        )}
      </div>

      <div className="mt-2 border-t border-base-700/50 pt-2">
        <textarea
          className="input min-h-[52px] resize-none text-xs"
          placeholder="Ask me anything… (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">
            {problem && (problem.title || problem.slug) ? "🧠 grounded in current problem" : "general mode"}
          </span>
          <button
            className="btn-primary !px-4 !py-1.5 text-xs"
            disabled={!input.trim() || streaming}
            onClick={() => void send(input)}
          >
            {streaming ? "▋" : "Send ➤"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}
