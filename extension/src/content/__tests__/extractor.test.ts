import { describe, expect, it, beforeEach } from "vitest";
import {
  extractCode,
  extractConstraints,
  extractDescription,
  extractDifficulty,
  extractExamples,
  extractFunctionSignature,
  extractLanguage,
  extractTags,
  extractProblem,
} from "../extractor";

function seedDom(html: string) {
  document.body.innerHTML = html;
}

beforeEach(() => {
  document.body.innerHTML = "";
  // extractLanguage falls back to window.location.search
  history.replaceState({}, "", "/problems/two-sum/description/");
});

describe("extractDifficulty", () => {
  it("reads the difficulty badge class", () => {
    seedDom('<span class="text-difficulty-easy">Easy</span>');
    expect(extractDifficulty()).toBe("Easy");
  });

  it("reads difficulty by text", () => {
    seedDom('<span class="inline-block">Hard</span>');
    expect(extractDifficulty()).toBe("Hard");
  });

  it("returns empty when absent", () => {
    expect(extractDifficulty()).toBe("");
  });
});

describe("extractTags", () => {
  it("collects topic tags", () => {
    seedDom(
      '<div class="flex wrap gap-1"><a href="/tag/array/">Array</a><a href="/tag/hash-table/">Hash Table</a></div>',
    );
    expect(extractTags()).toContain("Array");
    expect(extractTags()).toContain("Hash Table");
  });
});

describe("extractDescription / examples / constraints", () => {
  it("extracts description text without <pre> blocks", () => {
    seedDom(
      '<div data-track-load="description_content"><p>Given an array nums</p><pre>1 2 3</pre><p>return it.</p></div>',
    );
    const desc = extractDescription();
    expect(desc).toContain("Given an array nums");
    expect(desc).toContain("return it.");
  });

  it("extracts examples from <pre> blocks", () => {
    seedDom(
      '<div data-track-load="description_content"><pre>Input: nums = [2,7], target = 9\nOutput: [0,1]</pre></div>',
    );
    const examples = extractExamples();
    expect(examples.length).toBe(1);
    expect(examples[0].input).toContain("nums = [2,7]");
    expect(examples[0].output).toContain("[0,1]");
  });

  it("extracts constraints from <ul><li>", () => {
    seedDom(
      '<div data-track-load="description_content"><ul><li>2 <= nums.length <= 10^4</li><li>-10^9 <= nums[i] <= 10^9</li></ul></div>',
    );
    expect(extractConstraints().length).toBe(2);
  });
});

describe("extractCode", () => {
  it("joins monaco view lines", () => {
    seedDom(
      '<div class="view-lines"><div class="view-line">def twoSum(nums, target):</div><div class="view-line">    pass</div></div>',
    );
    expect(extractCode()).toBe("def twoSum(nums, target):\n    pass");
  });
});

describe("extractFunctionSignature", () => {
  it("parses python signature", () => {
    const sig = extractFunctionSignature("def twoSum(nums, target):\n    return []");
    expect(sig?.name).toBe("twoSum");
    expect(sig?.params).toContain("nums");
    expect(sig?.params).toContain("target");
  });
});

describe("extractLanguage", () => {
  it("detects the selected tab", () => {
    seedDom(
      '<div class="ant-segmented-item ant-segmented-item-selected"><span>Python3</span></div>',
    );
    expect(extractLanguage()).toBe("python");
  });

  it("does not confuse C++ with C", () => {
    seedDom(
      '<div class="ant-segmented-item ant-segmented-item-selected"><span>C++</span></div>',
    );
    expect(extractLanguage()).toBe("cpp");
  });

  it("falls back to the URL lang param", () => {
    history.replaceState({}, "", "/problems/two-sum/solution/?lang=java");
    expect(extractLanguage()).toBe("java");
  });
});

describe("extractProblem (integration)", () => {
  it("assembles a full problem", () => {
    seedDom(`
      <h1>1. Two Sum</h1>
      <span class="text-difficulty-easy">Easy</span>
      <div class="flex wrap gap-1"><a href="/tag/array/">Array</a></div>
      <div data-track-load="description_content">
        <p>Given nums return indices.</p>
        <pre>Input: nums = [2,7], target = 9\nOutput: [0,1]</pre>
        <ul><li>2 <= nums.length <= 10^4</li></ul>
      </div>
      <div class="view-lines"><div class="view-line">def twoSum(nums, target):</div></div>
    `);
    const problem = extractProblem();
    expect(problem.slug).toBe("two-sum");
    expect(problem.title).toContain("Two Sum");
    expect(problem.difficulty).toBe("Easy");
    expect(problem.tags).toContain("Array");
    expect(problem.description).toContain("indices");
    expect(problem.examples.length).toBe(1);
    expect(problem.functionSignature?.name).toBe("twoSum");
  });
});
