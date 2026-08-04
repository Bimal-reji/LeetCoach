/**
 * Dashboard API client.
 *
 * Uses the Vite dev proxy (`/api` -> :8000) in development, or
 * `VITE_API_URL` when deployed. Device identity lives in localStorage so the
 * dashboard shares progress with the extension's device when the same value
 * is present (the extension stores it in chrome.storage.local — copy it once
 * to link them, or just use the dashboard standalone).
 */
import type {
  ChatChunk,
  ChatMessage,
  ComplexityResponse,
  DailyChallenge,
  DebugResponse,
  ExplainResponse,
  ExtractedProblem,
  Flashcard,
  HintsResponse,
  InterviewFeedback,
  InterviewResponse,
  LeaderboardEntry,
  Note,
  PatternResponse,
  ProgressResponse,
  ReviewResponse,
  Revision,
  SimilarResponse,
  SolutionResponse,
} from "@leetcoach/shared/types";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1";

const DEVICE_KEY = "leetcoach.deviceId";

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function camelize<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map(camelize) as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = camelize(v);
    }
    return out as T;
  }
  return value as T;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": getDeviceId(),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!resp.ok) {
    let message = `Request failed (${resp.status})`;
    try {
      const data = await resp.json();
      message = data?.error?.message ?? message;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, resp.status);
  }
  return camelize<T>(await resp.json());
}

export async function* streamChat(
  message: string,
  history: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<ChatChunk> {
  const resp = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-Id": getDeviceId() },
    body: JSON.stringify({ message, history }),
    signal,
  });
  if (!resp.ok || !resp.body) throw new ApiError(`Chat failed (${resp.status})`, resp.status);
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      if (!raw.trim().startsWith("data:")) continue;
      try {
        yield JSON.parse(raw.trim().slice(5)) as ChatChunk;
      } catch {
        /* skip */
      }
    }
  }
}

export const api = {
  health: () => request<{ status: string; version: string; aiProvider: string }>("/health"),
  progress: () => request<ProgressResponse>("/progress"),
  leaderboard: (limit = 25) => request<LeaderboardEntry[]>(`/leaderboard?limit=${limit}`),
  daily: () => request<DailyChallenge>("/ai/daily"),
  problems: () => request<{ slug: string; title: string; difficulty: string; tags: string[] }[]>("/problems"),
  // notes
  listNotes: (slug?: string) => request<Note[]>(`/notes${slug ? `?problem_slug=${encodeURIComponent(slug)}` : ""}`),
  createNote: (n: { problemSlug?: string; title: string; body: string; tags: string[] }) =>
    request<Note>("/notes", { method: "POST", body: n }),
  deleteNote: (id: number) => request<void>(`/notes/${id}`, { method: "DELETE" }),
  // flashcards
  listFlashcards: (dueOnly = false) => request<Flashcard[]>(`/flashcards?due_only=${dueOnly}`),
  reviewFlashcard: (id: number, recalled: boolean) =>
    request<Flashcard>(`/flashcards/${id}/review`, { method: "POST", body: { recalled } }),
  deleteFlashcard: (id: number) => request<void>(`/flashcards/${id}`, { method: "DELETE" }),
  // revisions
  listRevisions: (kind?: string) => request<Revision[]>(`/revisions${kind ? `?kind=${kind}` : ""}`),
  createRevision: (r: { problemSlug?: string; kind: string; content: string }) =>
    request<Revision>("/revisions", { method: "POST", body: r }),
  deleteRevision: (id: number) => request<void>(`/revisions/${id}`, { method: "DELETE" }),
  // profile
  updateProfile: (displayName: string) =>
    request<{ ok: boolean }>("/progress/profile", { method: "PUT", body: { display_name: displayName } }),
  // ai (used by the embedded problem coach page)
  hints: (problem: ExtractedProblem, levelsToReveal: number) =>
    request<HintsResponse>("/ai/hints", { method: "POST", body: { problem, levels_to_reveal: levelsToReveal } }),
  pattern: (problem: ExtractedProblem) => request<PatternResponse>("/ai/pattern", { method: "POST", body: problem }),
  complexity: (problem: ExtractedProblem) => request<ComplexityResponse>("/ai/complexity", { method: "POST", body: problem }),
  debug: (problem: ExtractedProblem, error: string) =>
    request<DebugResponse>("/ai/debug", { method: "POST", body: { problem, error } }),
  review: (problem: ExtractedProblem) => request<ReviewResponse>("/ai/review", { method: "POST", body: problem }),
  explain: (problem: ExtractedProblem, mode: string) =>
    request<ExplainResponse>("/ai/explain", { method: "POST", body: { problem, mode } }),
  interview: (problem: ExtractedProblem) => request<InterviewResponse>("/ai/interview", { method: "POST", body: problem }),
  interviewFeedback: (problem: ExtractedProblem, questionId: string, answer: string) =>
    request<InterviewFeedback>("/ai/interview/feedback", {
      method: "POST",
      body: { problem, question_id: questionId, answer },
    }),
  solution: (problem: ExtractedProblem) => request<SolutionResponse>("/ai/solution", { method: "POST", body: problem }),
  similar: (problem: ExtractedProblem) => request<SimilarResponse>("/ai/similar", { method: "POST", body: problem }),
};

export function toProblemPayload(p: ExtractedProblem): Record<string, unknown> {
  return {
    slug: p.slug,
    leetcode_id: p.leetcodeId ?? null,
    title: p.title,
    difficulty: p.difficulty || "Medium",
    tags: p.tags,
    description: p.description,
    examples: p.examples,
    constraints: p.constraints,
    function_signature: p.functionSignature,
    url: p.url,
    code: p.code,
    language: p.language || "python",
  };
}
