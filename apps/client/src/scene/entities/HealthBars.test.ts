import { describe, expect, it } from "vitest";
import { healthRatio } from "./HealthBars";

describe("healthRatio", () => {
  it("clamps current health to the valid bar range", () => {
    expect(healthRatio(50, 100)).toBe(0.5);
    expect(healthRatio(120, 100)).toBe(1);
    expect(healthRatio(-1, 100)).toBe(0);
  });

  it("returns empty for invalid maximums", () => {
    expect(healthRatio(10, 0)).toBe(0);
    expect(healthRatio(Number.NaN, 100)).toBe(0);
  });
});
