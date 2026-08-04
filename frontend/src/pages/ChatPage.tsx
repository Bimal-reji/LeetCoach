import { useEffect, useRef, useState } from "react";
import { streamChat } from "../api/client";
import type { ChatMessage } from "@leetcoach/shared/types";

const PROMPTS = ["Explain DP", "What is BFS?", "Explain recursion with an example", "How do I get better at LeetCode?"];

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text.trim() }]);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      let full = "";
      for await (const chunk of streamChat(text.trim(), messages.slice(-12))) {
        full += chunk.delta;
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { ...next[next.length - 1], content: full };
          return next;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { ...next[next.length - 1], content: `⚠️ ${e instanceof Error ? e.message : "Chat failed"}` };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col space-y-4 animate-fade-up">
      <div>
        <h1 className="page-title">AI Chat</h1>
        <p className="page-sub">Ask about any DSA concept — answers stream in live.</p>
      </div>

      <div className="card flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <span className="text-5xl">💬</span>
              <p className="max-w-sm text-sm text-slate-400">
                Ask about dynamic programming, graphs, recursion — or how to approach interviews.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {PROMPTS.map((p) => (
                  <button key={p} onClick={() => void send(p)} className="chip bg-base-800 text-slate-300 transition hover:bg-brand-500/20 hover:text-brand-300">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "border border-base-600/60 bg-base-800/70 text-slate-200"
                }`}
              >
                {m.content || (streaming && <TypingDots />)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2 border-t border-base-700/50 pt-3">
          <textarea
            className="input min-h-[44px] flex-1 resize-none"
            placeholder="Ask anything… (Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <button className="btn-primary shrink-0" disabled={!input.trim() || streaming} onClick={() => void send(input)}>
            Send
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
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  );
}
