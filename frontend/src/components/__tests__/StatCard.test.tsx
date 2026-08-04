import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatCard } from "../StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    const html = renderToString(<StatCard icon="🔥" label="Day streak" value="7" />);
    expect(html).toContain("7");
    expect(html).toContain("Day streak");
    expect(html).toContain("🔥");
  });

  it("renders an optional hint", () => {
    const html = renderToString(<StatCard icon="⭐" label="Points" value="42" hint="Earn points" />);
    expect(html).toContain("Earn points");
  });
});
