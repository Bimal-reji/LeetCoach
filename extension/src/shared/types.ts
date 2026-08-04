/**
 * Shared types used across the extension (content, background, side panel).
 * These mirror the backend's Pydantic schemas (camelCase on the wire).
 */

export type Difficulty = "Easy" | "Medium" | "Hard" | "";

export interface ExtractedExample {
  input?: string;
  output?: string;
  explanation?: string;
}

/** The normalized problem payload extracted from leetcode.com. */
export interface ExtractedProblem {
  slug: string;
  leetcodeId?: number | null;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  description: string;
  examples: ExtractedExample[];
  constraints: string[];
  functionSignature: Record<string, unknown> | null;
  url: string;
  language: string;
  code: string;
}

export const EMPTY_PROBLEM: ExtractedProblem = {
  slug: "",
  leetcodeId: null,
  title: "",
  difficulty: "",
  tags: [],
  description: "",
  examples: [],
  constraints: [],
  functionSignature: null,
  url: "",
  language: "python",
  code: "",
};

// ------------------------------------------------------------------ AI
export interface HintLevel {
  level: number;
  title: string;
  hint: string;
}

export interface HintsResponse {
  pattern: string;
  levels: HintLevel[];
  codeRevealed: boolean;
  source: string;
}

export interface PatternMatch {
  key: string;
  name: string;
  confidence: number;
  reason: string;
}

export interface PatternResponse {
  primary: PatternMatch;
  alternatives: PatternMatch[];
  explanation: string;
  whenToUse: string;
  source: string;
}

export interface ComplexityResponse {
  timeComplexity: string;
  spaceComplexity: string;
  explanation: string;
  optimizations: string[];
  source: string;
}

export interface DebugResponse {
  possibleMistakes: string[];
  edgeCases: string[];
  missingConditions: string[];
  suggestedTests: string[];
  source: string;
}

export interface ReviewFinding {
  category: string;
  severity: "info" | "warning" | "critical";
  message: string;
  suggestion: string;
}

export interface ReviewResponse {
  rating: number;
  summary: string;
  findings: ReviewFinding[];
  source: string;
}

export interface LineExplanation {
  line: number;
  code: string;
  explanation: string;
}

export interface ExplainResponse {
  mode: "beginner" | "intermediate" | "interview";
  overview: string;
  lines: LineExplanation[];
  source: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  expectedPoints: string[];
}

export interface InterviewResponse {
  questions: InterviewQuestion[];
  source: string;
}

export interface InterviewFeedback {
  score: number;
  feedback: string;
  whatToImprove: string[];
  sampleAnswer: string;
  source: string;
}

export interface SolutionResponse {
  solution: string;
  explanation: string;
  language: string;
  source: string;
}

export interface SimilarProblem {
  slug: string;
  leetcodeId: number;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  pattern: string;
  url: string;
}

export interface SimilarResponse {
  easy: SimilarProblem[];
  medium: SimilarProblem[];
  hard: SimilarProblem[];
  source: string;
}

export interface DailyChallenge {
  date: string;
  problem: Record<string, unknown>;
  focusTopics: string[];
  plan: string[];
  source: string;
}

// ------------------------------------------------------------------ Tracking
export interface TopicStat {
  topic: string;
  attempted: number;
  solved: number;
  firstTryRate: number;
  avgTimeMs: number | null;
  strength: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface ProgressResponse {
  solvedCount: number;
  attemptedCount: number;
  streak: number;
  longestStreak: number;
  points: number;
  totalTimeMs: number;
  topics: TopicStat[];
  weakTopics: string[];
  strongTopics: string[];
  heatmap: HeatmapDay[];
  difficultyCounts: Record<string, number>;
}

export interface LeaderboardEntry {
  deviceId: string;
  displayName: string;
  points: number;
  solvedCount: number;
  streak: number;
}

export interface Note {
  id?: number;
  problemSlug?: string | null;
  title: string;
  body: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Flashcard {
  id?: number;
  problemSlug?: string | null;
  question: string;
  answer: string;
  box?: number;
  reviewCount?: number;
  nextReviewAt?: string;
}

export interface Revision {
  id?: number;
  problemSlug?: string | null;
  kind: "observation" | "pattern" | "mistake" | "tip";
  content: string;
  createdAt?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatChunk {
  delta: string;
  done: boolean;
  error?: string | null;
}
