import { describe, expect, it } from "vitest";
import { toProblemPayload } from "../api";
import type { ExtractedProblem } from "../types";

const problem: ExtractedProblem = {
  slug: "two-sum",
  leetcodeId: 1,
  title: "Two Sum",
  difficulty: "Easy",
  tags: ["Array"],
  description: "find two numbers",
  examples: [{ input: "[1,2]", output: "[0]" }],
  constraints: ["2 <= n <= 10^4"],
  functionSignature: { name: "twoSum" },
  url: "https://leetcode.com/problems/two-sum/",
  language: "python",
  code: "def twoSum(nums, target):\n    pass",
};

describe("toProblemPayload", () => {
  it("maps camelCase to snake_case for the backend", () => {
    const payload = toProblemPayload(problem);
    expect(payload.leetcode_id).toBe(1);
    expect(payload.function_signature).toEqual({ name: "twoSum" });
    expect(payload.language).toBe("python");
    expect(payload.code).toContain("def twoSum");
  });

  it("defaults difficulty and language", () => {
    const payload = toProblemPayload({ ...problem, difficulty: "", language: "" });
    expect(payload.difficulty).toBe("Medium");
    expect(payload.language).toBe("python");
  });
});
