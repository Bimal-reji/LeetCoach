/**
 * Typed API client for the LeetCoach backend.
 *
 * Works from any extension context (side panel, popup, options). The device id
 * is read from chrome.storage.local (created by the background worker) and
 * sent as the `X-Device-Id` header.
 */
import { DEFAULT_BACKEND_URL, STORAGE_KEYS } from "./constants";
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
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getBackendUrl(): Promise<string> {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.settings);
    const settings = (data[STORAGE_KEYS.settings] ?? {}) as { backendUrl?: string };
    return (settings.backendUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

async function getDeviceId(): Promise<string> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.deviceId);
  return (data[STORAGE_KEYS.deviceId] as string) || "unknown-device";
}

/** Map a snake_case backend payload into camelCase. */
function camelize<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map(camelize) as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const key = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      out[key] = camelize(v);
    }
    return out as T;
  }
  return value as T;
}

/** Build a camelCase ProblemContext for the backend. */
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

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const base = await getBackendUrl();
  const deviceId = await getDeviceId();
  const resp = await fetch(`${base}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
  if (!resp.ok) {
    let message = `Request failed (${resp.status})`;
    try {
      const data = await resp.json();
      message = data?.error?.message ?? message;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(message, resp.status);
  }
  return camelize<T>(await resp.json());
}

/** Stream a chat reply as an async generator of chunks (SSE over fetch). */
export async function* streamChat(
  message: string,
  history: ChatMessage[],
  problem: ExtractedProblem | null,
  signal?: AbortSignal,
): AsyncGenerator<ChatChunk> {
  const base = await getBackendUrl();
  const deviceId = await getDeviceId();
  const resp = await fetch(`${base}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
    body: JSON.stringify({
      message,
      history,
      problem: problem ? toProblemPayload(problem) : null,
    }),
    signal,
  });
  if (!resp.ok || !resp.body) {
    throw new ApiError(`Chat failed (${resp.status})`, resp.status);
  }

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
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      try {
        yield JSON.parse(line.slice(5).trim()) as ChatChunk;
      } catch {
        /* skip malformed chunk */
      }
    }
  }
}

export interface Api {
  health(): Promise<{ status: string; version: string; aiProvider: string; database: string; cache: string }>;
  hints(problem: ExtractedProblem, levelsToReveal: number): Promise<HintsResponse>;
  pattern(problem: ExtractedProblem): Promise<PatternResponse>;
  complexity(problem: ExtractedProblem): Promise<ComplexityResponse>;
  debug(problem: ExtractedProblem, error: string): Promise<DebugResponse>;
  review(problem: ExtractedProblem): Promise<ReviewResponse>;
  explain(problem: ExtractedProblem, mode: string): Promise<ExplainResponse>;
  interview(problem: ExtractedProblem): Promise<InterviewResponse>;
  interviewFeedback(problem: ExtractedProblem, questionId: string, answer: string): Promise<InterviewFeedback>;
  solution(problem: ExtractedProblem): Promise<SolutionResponse>;
  similar(problem: ExtractedProblem): Promise<SimilarResponse>;
  daily(): Promise<DailyChallenge>;
  generateFlashcards(problemSlug: string, count: number): Promise<Flashcard[]>;
  progress(): Promise<ProgressResponse>;
  leaderboard(limit?: number): Promise<LeaderboardEntry[]>;
  listNotes(problemSlug?: string): Promise<Note[]>;
  createNote(note: { problemSlug?: string; title: string; body: string; tags: string[] }): Promise<Note>;
  updateNote(id: number, patch: Partial<Pick<Note, "title" | "body" | "tags">>): Promise<Note>;
  deleteNote(id: number): Promise<void>;
  listFlashcards(dueOnly?: boolean): Promise<Flashcard[]>;
  createFlashcard(fc: { problemSlug?: string; question: string; answer: string }): Promise<Flashcard>;
  reviewFlashcard(id: number, recalled: boolean): Promise<Flashcard>;
  deleteFlashcard(id: number): Promise<void>;
  listRevisions(kind?: string): Promise<Revision[]>;
  createRevision(rev: { problemSlug?: string; kind: string; content: string }): Promise<Revision>;
  deleteRevision(id: number): Promise<void>;
  upsertProblem(problem: ExtractedProblem, status: string, firstTry: boolean, timeMs?: number | null): Promise<void>;
}

export const api: Api = {
  health: () => request("/api/v1/health"),
  hints: (problem, levelsToReveal) =>
    request("/api/v1/ai/hints", { method: "POST", body: { problem: toProblemPayload(problem), levels_to_reveal: levelsToReveal } }),
  pattern: (problem) => request("/api/v1/ai/pattern", { method: "POST", body: toProblemPayload(problem) }),
  complexity: (problem) => request("/api/v1/ai/complexity", { method: "POST", body: toProblemPayload(problem) }),
  debug: (problem, error) =>
    request("/api/v1/ai/debug", { method: "POST", body: { problem: toProblemPayload(problem), error } }),
  review: (problem) => request("/api/v1/ai/review", { method: "POST", body: toProblemPayload(problem) }),
  explain: (problem, mode) =>
    request("/api/v1/ai/explain", { method: "POST", body: { problem: toProblemPayload(problem), mode } }),
  interview: (problem) => request("/api/v1/ai/interview", { method: "POST", body: toProblemPayload(problem) }),
  interviewFeedback: (problem, questionId, answer) =>
    request("/api/v1/ai/interview/feedback", {
      method: "POST",
      body: { problem: toProblemPayload(problem), question_id: questionId, answer },
    }),
  solution: (problem) => request("/api/v1/ai/solution", { method: "POST", body: toProblemPayload(problem) }),
  similar: (problem) => request("/api/v1/ai/similar", { method: "POST", body: toProblemPayload(problem) }),
  daily: () => request("/api/v1/ai/daily"),
  generateFlashcards: (problemSlug, count) =>
    request("/api/v1/ai/flashcards/generate", { method: "POST", body: { problem_slug: problemSlug, count } }),
  progress: () => request("/api/v1/progress"),
  leaderboard: (limit = 20) => request(`/api/v1/leaderboard?limit=${limit}`),
  listNotes: (problemSlug) => request(`/api/v1/notes${problemSlug ? `?problem_slug=${encodeURIComponent(problemSlug)}` : ""}`),
  createNote: (note) => request("/api/v1/notes", { method: "POST", body: note }),
  updateNote: (id, patch) => request(`/api/v1/notes/${id}`, { method: "PUT", body: patch }),
  deleteNote: (id) => request(`/api/v1/notes/${id}`, { method: "DELETE" }),
  listFlashcards: (dueOnly = false) => request(`/api/v1/flashcards?due_only=${dueOnly}`),
  createFlashcard: (fc) => request("/api/v1/flashcards", { method: "POST", body: fc }),
  reviewFlashcard: (id, recalled) =>
    request(`/api/v1/flashcards/${id}/review`, { method: "POST", body: { recalled } }),
  deleteFlashcard: (id) => request(`/api/v1/flashcards/${id}`, { method: "DELETE" }),
  listRevisions: (kind) => request(`/api/v1/revisions${kind ? `?kind=${kind}` : ""}`),
  createRevision: (rev) => request("/api/v1/revisions", { method: "POST", body: rev }),
  deleteRevision: (id) => request(`/api/v1/revisions/${id}`, { method: "DELETE" }),
  upsertProblem: (problem, status, firstTry, timeMs) =>
    request("/api/v1/problems", {
      method: "POST",
      body: { problem: toProblemPayload(problem), status, first_try: firstTry, time_ms: timeMs ?? null },
    }),
};
