import { describe, it, expect } from "vitest";
import { floodComponents, multiSourceDistance, type FloodGrid } from "./flood.js";

/** A 3x3 grid, non-wrapping, with a lone `true` tile at each corner-ish spot. */
function nonWrapGrid(width: number, height: number): FloodGrid {
  return { width, height, wrap: { isWraparoundX: false, width } };
}

function wrapGrid(width: number, height: number): FloodGrid {
  return { width, height, wrap: { isWraparoundX: true, width } };
}

describe("floodComponents", () => {
  it("counts two disconnected single-tile components on a 3x3 grid", () => {
    // .X.
    // ...
    // .X.
    const grid = nonWrapGrid(3, 3);
    const cells = new Set([1, 7]); // (q=1,r=0) and (q=1,r=2)
    const result = floodComponents(grid, (idx) => cells.has(idx));
    expect(result.componentSize).toEqual([1, 1]);
    expect(result.componentId[1]).toBe(0);
    expect(result.componentId[7]).toBe(1);
    expect(result.componentId[0]).toBe(-1);
  });

  it("merges neighbouring true tiles into one component", () => {
    // XX.
    // ...
    // ...
    const grid = nonWrapGrid(3, 3);
    const cells = new Set([0, 1]);
    const result = floodComponents(grid, (idx) => cells.has(idx));
    expect(result.componentSize).toEqual([2]);
    expect(result.componentId[0]).toBe(0);
    expect(result.componentId[1]).toBe(0);
  });

  it("does not treat east and west edges as adjacent without wraparound", () => {
    const grid = nonWrapGrid(4, 1);
    const cells = new Set([0, 3]); // leftmost and rightmost column
    const result = floodComponents(grid, (idx) => cells.has(idx));
    expect(result.componentSize).toEqual([1, 1]);
  });

  it("wraparound merges the west and east edges into one component", () => {
    const grid = wrapGrid(4, 1);
    const cells = new Set([0, 3]); // leftmost and rightmost column, adjacent on a cylinder
    const result = floodComponents(grid, (idx) => cells.has(idx));
    expect(result.componentSize).toEqual([2]);
  });

  it("componentTiles first index is the row-major seed, giving deterministic (r,q) order", () => {
    const grid = nonWrapGrid(3, 3);
    // (q=0,r=0), (q=2,r=0), (q=0,r=2) — mutually non-adjacent on the hex grid,
    // inserted out of order to prove scan order (not Set order) decides result.
    const cells = new Set([6, 2, 0]);
    const result = floodComponents(grid, (idx) => cells.has(idx));
    expect(result.componentSize).toEqual([1, 1, 1]);
    expect(result.componentTiles.map((tiles) => tiles[0])).toEqual([0, 2, 6]);
  });

  it("is deterministic across repeated runs on the same inputs", () => {
    const grid = nonWrapGrid(5, 5);
    const cells = new Set([0, 1, 6, 12, 24]);
    const r1 = floodComponents(grid, (idx) => cells.has(idx));
    const r2 = floodComponents(grid, (idx) => cells.has(idx));
    expect(r1).toEqual(r2);
  });
});

describe("multiSourceDistance", () => {
  it("returns 0 at every seed and grows by hex steps outward", () => {
    const grid = nonWrapGrid(3, 3);
    const dist = multiSourceDistance(grid, [4]); // centre of the 3x3 grid
    expect(dist[4]).toBe(0);
    // every non-seed reachable tile is a neighbour of the centre, distance 1
    for (let i = 0; i < dist.length; i++) {
      if (i === 4) continue;
      expect(dist[i]).toBeGreaterThanOrEqual(1);
    }
  });

  it("multiple seeds each contribute their own zero, distance is the minimum over all seeds", () => {
    const grid = nonWrapGrid(5, 1);
    const dist = multiSourceDistance(grid, [0, 4]);
    expect(dist[0]).toBe(0);
    expect(dist[4]).toBe(0);
    expect(dist[2]).toBe(2); // 2 hex steps from either end on a 1-row strip
  });

  it("wraparound finds a shorter path across the east-west seam", () => {
    const nonWrap = multiSourceDistance(nonWrapGrid(8, 1), [0]);
    const wrapped = multiSourceDistance(wrapGrid(8, 1), [0]);
    // Non-wrapping: the far end of the strip is 7 steps away.
    expect(nonWrap[7]).toBe(7);
    // Wrapping: the same tile is reachable by going the other way round, 1 step.
    expect(wrapped[7]).toBe(1);
  });

  it("unreached tiles stay at Infinity when no seed is reachable", () => {
    const grid = nonWrapGrid(2, 1);
    const dist = multiSourceDistance(grid, []);
    expect(dist).toEqual([Infinity, Infinity]);
  });
});
