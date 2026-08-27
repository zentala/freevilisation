import { describe, it, expect } from "vitest";
import { createPrng, neighbors } from "@freevilisation/engine";
import type { WrapContext } from "@freevilisation/engine";
import { traceRiverFromSource, selectRiverSources } from "./rivers.js";
import type { RiversResult } from "./rivers.js";
import { farthestPointSample } from "./start-positions.js";

function makeRiversResult(total: number): RiversResult {
  return {
    riverEdgeDir0: new Array<boolean>(total).fill(false),
    riverEdgeDir1: new Array<boolean>(total).fill(false),
    riverEdgeDir2: new Array<boolean>(total).fill(false),
  };
}

function flatWrap(width: number): WrapContext {
  return { isWraparoundX: false, width };
}

function countRiverEdges(rivers: RiversResult): number {
  return (
    rivers.riverEdgeDir0.filter(Boolean).length +
    rivers.riverEdgeDir1.filter(Boolean).length +
    rivers.riverEdgeDir2.filter(Boolean).length
  );
}

describe("traceRiverFromSource — destination seeking", () => {
  it("ends adjacent to (or on) the closest water tile, not an inland local minimum", () => {
    const width = 9;
    const height = 9;
    const total = width * height;
    const isLand = new Array<boolean>(total).fill(true);
    const seaIdx = (height - 1) * width + (width - 1); // far corner
    isLand[seaIdx] = false;
    const wrap = flatWrap(width);
    const rivers = makeRiversResult(total);

    const sourceIdx = 0; // opposite corner
    const finalIdx = traceRiverFromSource(sourceIdx, width, height, isLand, wrap, rivers, 1000);

    expect(isLand[finalIdx]).toBe(true);
    const fq = finalIdx % width;
    const fr = (finalIdx - fq) / width;
    const isAdjacentToWater = neighbors({ q: fq, r: fr }, wrap).some(({ q: nq, r: nr }) => {
      if (nr < 0 || nr >= height || nq < 0 || nq >= width) return false;
      return !isLand[nr * width + nq]!;
    });
    expect(isAdjacentToWater).toBe(true);
    expect(countRiverEdges(rivers)).toBeGreaterThan(0);
  });
});

describe("traceRiverFromSource — circuit breaker", () => {
  it("truncates instead of looping when maxSteps is smaller than the path to the outlet", () => {
    const width = 40;
    const height = 1; // corridor: only the two along-axis neighbors survive
    const total = width * height;
    const isLand = new Array<boolean>(total).fill(true);
    isLand[width - 1] = false; // sea only at the far end
    const wrap = flatWrap(width);
    const rivers = makeRiversResult(total);

    const maxSteps = 3;
    const finalIdx = traceRiverFromSource(0, width, height, isLand, wrap, rivers, maxSteps);

    expect(finalIdx).toBeLessThan(width - 1);
    expect(countRiverEdges(rivers)).toBeGreaterThan(0);
    expect(countRiverEdges(rivers)).toBeLessThanOrEqual(maxSteps);
  });
});

describe("selectRiverSources", () => {
  it("draws only from the top-decile elevation pool, via the shared farthest-point sampler", () => {
    const width = 10;
    const height = 10;
    const total = width * height;
    const landIndices: number[] = [];
    const elevation = new Array<number>(total).fill(0);
    for (let i = 0; i < total; i++) {
      landIndices.push(i);
      elevation[i] = i;
    }
    const wrap = flatWrap(width);
    const numSources = 5;
    const seed = 777;

    const sources = selectRiverSources(
      landIndices,
      elevation,
      width,
      numSources,
      { prng: createPrng(seed).fork("river-sources"), onProgress: () => {} },
      wrap,
    );

    const decileFloor = 90; // ceil(100 * 0.1) = 10 highest elevations: 90..99
    for (const idx of sources) {
      expect(elevation[idx]!).toBeGreaterThanOrEqual(decileFloor);
    }

    // Parity check with a direct call to the shared sampler over the same
    // pool and an identically-forked PRNG: proves reuse, not a second
    // spacing algorithm written inside rivers.ts.
    const pool = landIndices
      .filter((idx) => elevation[idx]! >= decileFloor)
      .sort((a, b) => elevation[b]! - elevation[a]!)
      .map((idx) => ({ q: idx % width, r: (idx - (idx % width)) / width, idx }));
    const expected = farthestPointSample(
      pool,
      numSources,
      { prng: createPrng(seed).fork("river-sources"), onProgress: () => {} },
      wrap,
    ).map((c) => c.idx);

    expect(sources).toEqual(expected);
  });
});
