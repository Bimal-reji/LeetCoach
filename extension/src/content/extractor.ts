/**
 * LeetCode DOM extraction.
 *
 * LeetCode's markup changes over time, so every selector is a multi-fallback
 * list. Extraction is defensive: any missing field degrades to a sensible
 * default rather than throwing.
 */
import type { Difficulty, ExtractedExample, ExtractedProblem } from "../shared/types";

const DIFFICULTY_KEYWORDS: Difficulty[] = ["Easy", "Medium", "Hard"];

const TITLE_SELECTORS = [
  "h1",
  ".text-title-large a",
  "div[data-track-load='description_content'] h1",
  "a[href*='/problems/'][class*='title']",
  '[data-track-load="description_content"] h1',
];

const DIFFICULTY_SELECTORS = [
  '[class*="difficulty"]',
  "div[data-track-load='description_content'] span",
  ".inline-block span",
];

const TAG_SELECTORS = [
  "div.flex.wrap.gap-1 a[href*='/tag/']",
  "a[href*='/tag/']",
  '[data-track-load="description_content"] a[href*="/tag/"]',
];

const DESCRIPTION_SELECTORS = [
  '[data-track-load="description_content"]',
  ".question-content__JfgR",
  ".question-content-default",
  "[class*='question-content']",
];

const PRE_SELECTOR = "pre";
const CONSTRAINTS_UL_SELECTOR = "ul";

export function getProblemSlugFromUrl(): string {
  const match = window.location.pathname.match(/\/problems\/([^/?#]+)/);
  return match?.[1] ?? "";
}

export function isProblemPage(): boolean {
  return /\/problems\/[^/?#]+/.test(window.location.pathname);
}

function textOf(el: Element | null): string {
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function queryFirst(selectors: string[], root: ParentNode = document): Element | null {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el) return el;
  }
  return null;
}

/** Extract the difficulty badge. */
export function extractDifficulty(): Difficulty {
  for (const selector of DIFFICULTY_SELECTORS) {
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const text = textOf(el);
      for (const d of DIFFICULTY_KEYWORDS) {
        if (text === d || el.className?.includes?.(`difficulty-${d.toLowerCase()}`)) {
          return d;
        }
      }
    }
  }
  // Robust fallback: any element whose trimmed text is exactly a difficulty.
  for (const el of Array.from(document.querySelectorAll("span, div, a"))) {
    const text = (el.textContent ?? "").trim();
    if (text === "Easy" || text === "Medium" || text === "Hard") {
      const d = text as Difficulty;
      // Avoid matching long bodies that happen to be a single word.
      if ((el as HTMLElement).children.length <= 2) return d;
    }
  }
  return "";
}

/** Extract topic tags (Array, Hash Table, ...). */
export function extractTags(): string[] {
  const tags = new Set<string>();
  for (const selector of TAG_SELECTORS) {
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const t = textOf(el);
      if (t && !t.includes("Discuss") && !t.includes("Solution")) tags.add(t);
    }
  }
  // Fallback: parse comma-listed topics from the description sidebar.
  if (tags.size === 0) {
    document.querySelectorAll("[class*='topic-tag']").forEach((el) => {
      const t = textOf(el);
      if (t) tags.add(t);
    });
  }
  return Array.from(tags).slice(0, 8);
}

/** Extract the problem statement from the description tab. */
export function extractDescription(): string {
  const container = queryFirst(DESCRIPTION_SELECTORS);
  if (!container) return "";
  // Clone to avoid mutating the page.
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("script,style,pre,svg,button,textarea").forEach((n) => n.remove());
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 8000);
}

/** Extract examples (Example 1 / Example 2 blocks). */
export function extractExamples(): ExtractedExample[] {
  const container = queryFirst(DESCRIPTION_SELECTORS);
  if (!container) return [];
  const blocks = Array.from(container.querySelectorAll(PRE_SELECTOR)).slice(0, 5);
  if (blocks.length === 0) {
    // Fallback: parse <p>/<div> blocks containing "Example".
    const paras = Array.from(container.querySelectorAll("p, div"))
      .filter((el) => /Example\s*\d+/.test(textOf(el)))
      .slice(0, 5);
    return paras.map((p) => ({ input: textOf(p).slice(0, 1200) }));
  }
  return blocks.map((pre) => {
    const text = (pre.textContent ?? "").trim();
    const inputMatch = text.match(/Input:\s*([^\n]*)/);
    const outputMatch = text.match(/Output:\s*([^\n]*)/);
    const explanationMatch = text.match(/Explanation:\s*([^\n]*)/);
    return {
      input: inputMatch?.[1]?.trim() ?? text.slice(0, 400),
      output: outputMatch?.[1]?.trim() ?? "",
      explanation: explanationMatch?.[1]?.trim() ?? "",
    };
  });
}

/** Extract constraints (list items in the Constraints section). */
export function extractConstraints(): string[] {
  const container = queryFirst(DESCRIPTION_SELECTORS);
  if (!container) return [];
  const items = Array.from(container.querySelectorAll(`${CONSTRAINTS_UL_SELECTOR} > li`));
  if (items.length === 0) return [];
  return items.map((li) => textOf(li)).slice(0, 12);
}

/** Detect the active editor language from the tab strip. */
export function extractLanguage(): string {
  // Exact labels are checked first so "C++" isn't matched by the substring "c".
  const EXACT = new Map([
    ["c", "c"],
    ["c++", "cpp"],
    ["cpp", "cpp"],
    ["csharp", "csharp"],
    ["c#", "csharp"],
    ["java", "java"],
    ["javascript", "javascript"],
    ["typescript", "typescript"],
    ["python", "python"],
    ["python3", "python"],
    ["kotlin", "kotlin"],
    ["go", "go"],
    ["golang", "go"],
    ["rust", "rust"],
    ["ruby", "ruby"],
    ["swift", "swift"],
    ["scala", "scala"],
    ["php", "php"],
    ["dart", "dart"],
    ["elixir", "elixir"],
    ["racket", "racket"],
    ["erlang", "erlang"],
    ["bash", "bash"],
    ["mysql", "mysql"],
  ]);

  const candidates = Array.from(
    document.querySelectorAll(".ant-segmented-item, [class*='language-'], [role='tab'], [class*='tab'] button"),
  );
  for (const el of candidates) {
    const cls = typeof el.className === "string" ? el.className : "";
    const isSelected = cls.includes("selected") || el.getAttribute("aria-selected") === "true";
    if (!isSelected) continue;
    const label = (el.textContent ?? "").trim().toLowerCase();
    if (EXACT.has(label)) return EXACT.get(label)!;
    // Substring fallback for labels like "Python3" or "C++ (gcc)".
    for (const [key, mapped] of EXACT) {
      if (label.includes(key)) return mapped;
    }
  }
  // Fallback: ask the URL (solution tab shows ?lang=python3)
  const match = window.location.search.match(/lang=([a-z0-9]+)/i);
  if (match) return match[1].replace(/3$/, "");
  return "python";
}

/** Extract the current editor code from Monaco's DOM. */
export function extractCode(): string {
  const lineNodes = document.querySelectorAll(".view-lines .view-line");
  if (lineNodes.length === 0) {
    // Fallback: some editor roots expose code in a plain element.
    const editor = document.querySelector("#editor, .monaco-editor");
    if (!editor) return "";
    const text = editor.textContent ?? "";
    return text.replace(/\s+/g, " ").slice(0, 12000);
  }
  const lines: string[] = [];
  lineNodes.forEach((node) => lines.push(node.textContent ?? ""));
  return lines.join("\n").slice(0, 12000);
}

/** Extract the first function signature from the code. */
export function extractFunctionSignature(code: string): Record<string, unknown> | null {
  if (!code) return null;
  const patterns = [
    /(?:def|function)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/,
    /(?:func|public\s+static|static)\s+[^;{]*?\b([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/,
    /([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*{/,
  ];
  for (const pattern of patterns) {
    const m = code.match(pattern);
    if (m) {
      return {
        name: m[1],
        params: m[2]
          .split(",")
          .map((p) => p.trim().split(/\s+/).pop() ?? "")
          .filter(Boolean),
      };
    }
  }
  return null;
}

/** Full extraction for the current page. */
export function extractProblem(): ExtractedProblem {
  const slug = getProblemSlugFromUrl();
  const titleEl = queryFirst(TITLE_SELECTORS);
  let title = textOf(titleEl);
  // Clean the number prefix if present (e.g. "1. Two Sum").
  title = title.replace(/^\d+\.\s*/, "");
  const code = extractCode();

  return {
    slug,
    leetcodeId: extractProblemNumber(title),
    title,
    difficulty: extractDifficulty(),
    tags: extractTags(),
    description: extractDescription(),
    examples: extractExamples(),
    constraints: extractConstraints(),
    functionSignature: extractFunctionSignature(code),
    url: window.location.href,
    language: extractLanguage(),
    code,
  };
}

function extractProblemNumber(title: string): number | null {
  const m = title.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}
