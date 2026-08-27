import { describe, expect, it } from "vitest";
import { FadeSystem, fadeOpacity } from "./FadeSystem";

describe("FadeSystem", () => {
  it("interpolates opacity for fade in and out", () => {
    expect(fadeOpacity({ startedAt: 0, durationMs: 100, from: 0, to: 1 }, 50)).toBe(0.5);
    expect(fadeOpacity({ startedAt: 0, durationMs: 100, from: 1, to: 0 }, 100)).toBe(0);
  });

  it("removes an entity only after fade-out completes", () => {
    const fades = new FadeSystem(100);
    const id = "unit-1" as never;
    const removed: string[] = [];
    fades.fadeOut(id, 0);
    fades.update(99, (entityId) => removed.push(entityId as string));
    expect(removed).toEqual([]);
    fades.update(100, (entityId) => removed.push(entityId as string));
    expect(removed).toEqual(["unit-1"]);
  });
});
