import { describe, expect, it } from "vitest";
import { evaluateFrameBudget } from "./perfBudget";

describe("renderer frame budget", () => {
  it("accepts a 500-instance sample above the minimum frame rate", () => {
    const result = evaluateFrameBudget(Array.from({ length: 120 }, () => 16), 30);
    expect(result.frames).toBe(120);
    expect(result.averageFps).toBeCloseTo(62.5);
    expect(result.passed).toBe(true);
  });

  it("rejects samples with a frame below the budget", () => {
    expect(evaluateFrameBudget([16, 16, 40], 30).passed).toBe(false);
  });
});
