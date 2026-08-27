import { describe, expect, it } from "vitest";
import { wrapOffsets, wrapPeriod, wrappedTilePositions } from "./wraparound";

describe("wraparound rendering", () => {
  it("uses one copy on bounded maps", () => {
    expect(wrapOffsets(false, 20)).toEqual([0]);
  });

  it("duplicates edge chunks at one horizontal period", () => {
    const period = wrapPeriod(20);
    expect(wrapOffsets(true, 20)).toEqual([-period, 0, period]);
  });

  it("preserves tile coordinates while translating seam copies", () => {
    const positions = wrappedTilePositions({ q: 0, r: 0 }, true, 4);
    expect(positions).toHaveLength(3);
    expect(positions[1]).toMatchObject({ x: 0, y: 0, z: 0 });
    expect(positions[0]!.x).toBe(-wrapPeriod(4));
  });
});
