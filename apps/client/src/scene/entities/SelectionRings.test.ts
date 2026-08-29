import { describe, expect, it } from "vitest";
import { resolveSelectionRingTransforms } from "./SelectionRings";

describe("resolveSelectionRingTransforms", () => {
  it("uses the entity position when no animation exists", () => {
    const result = resolveSelectionRingTransforms([
      { id: "unit-1" as never, coord: { q: 1, r: 2 } },
    ]);
    expect(result[0]!.y).toBe(0);
  });

  it("uses the AnimationSystem transform for moving entities", () => {
    const result = resolveSelectionRingTransforms(
      [{ id: "unit-1" as never, coord: { q: 1, r: 2 } }],
      { getCurrentTransform: () => ({ x: 4, y: 5, z: 6 }) as never },
    );
    expect(result[0]).toEqual({ x: 4, y: 5, z: 6 });
  });
});
