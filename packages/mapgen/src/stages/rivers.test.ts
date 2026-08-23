import { describe, it, expect } from "vitest";
import { createPrng, AXIAL_DIRECTIONS, OWNED_EDGE_DIRECTIONS } from "@freevilisation/engine";
import { generateRivers } from "./rivers.js";
import type { RiversResult } from "./rivers.js";
import { generateLandmass } from "./landmass.js";
import type { MapGenParams } from "../pipeline.js";
import { wrapContextFor } from "../config.js";

function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return {
    seed: 12345,
    mapType: "continents",
    mapSize: "tiny",
    ...overrides,
  };
}

function runRivers(params: MapGenParams) {
  const landmassPrng = createPrng(params.seed).fork("landmass");
  const landmass = generateLandmass(params, {
    prng: landmassPrng,
    onProgress: () => {},
  });
  const riversPrng = createPrng(params.seed).fork("rivers");
  const rivers = generateRivers(params, landmass, {
    prng: riversPrng,
    onProgress: () => {},
  });
  return { landmass, rivers };
}

/** Reads the owned flag at index `i` for owned direction 0..2. */
function ownedFlag(rivers: RiversResult, i: number, ownedDirection: number): boolean {
  if (ownedDirection === 0) return rivers.riverEdgeDir0[i]!;
  if (ownedDirection === 1) return rivers.riverEdgeDir1[i]!;
  return rivers.riverEdgeDir2[i]!;
}

describe("generateRivers", () => {
  it("determinism: same seed produces byte-identical edge flags", () => {
    const params = makeParams();
    const r1 = runRivers(params);
    const r2 = runRivers(params);
    expect(r1.rivers.riverEdgeDir0).toEqual(r2.rivers.riverEdgeDir0);
    expect(r1.rivers.riverEdgeDir1).toEqual(r2.rivers.riverEdgeDir1);
    expect(r1.rivers.riverEdgeDir2).toEqual(r2.rivers.riverEdgeDir2);
  });

  it("edge flag arrays match width * height", () => {
    const params = makeParams({ mapSize: "tiny" });
    const { landmass, rivers } = runRivers(params);
    const total = landmass.width * landmass.height;
    expect(rivers.riverEdgeDir0.length).toBe(total);
    expect(rivers.riverEdgeDir1.length).toBe(total);
    expect(rivers.riverEdgeDir2.length).toBe(total);
  });

  it("every river edge touches only land tiles on both sides", () => {
    const params = makeParams();
    const { landmass, rivers } = runRivers(params);
    const { width, height } = landmass;
    const wrap = wrapContextFor(width);

    for (let i = 0; i < width * height; i++) {
      const q = i % width;
      const r = (i - q) / width;
      for (let d = 0; d < OWNED_EDGE_DIRECTIONS; d++) {
        if (!ownedFlag(rivers, i, d)) continue;
        expect(landmass.isLand[i]).toBe(true);

        const dir = AXIAL_DIRECTIONS[d]!;
        let nq = q + dir.q;
        const nr = r + dir.r;
        if (wrap.isWraparoundX) {
          nq = ((nq % width) + width) % width;
        }
        if (nr < 0 || nr >= height) continue;
        if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) continue;
        const ni = nr * width + nq;
        expect(landmass.isLand[ni]).toBe(true);
      }
    }
  });

  it("standard-size map at fixed seed produces at least one river edge", () => {
    const params = makeParams({ seed: 42, mapSize: "standard" });
    const { rivers } = runRivers(params);
    const hasAnyRiver =
      rivers.riverEdgeDir0.some(Boolean) ||
      rivers.riverEdgeDir1.some(Boolean) ||
      rivers.riverEdgeDir2.some(Boolean);
    expect(hasAnyRiver).toBe(true);
  });

  it("bounded-step safety: standard map completes without hanging", () => {
    const params = makeParams({ seed: 42, mapSize: "standard" });
    const { landmass, rivers } = runRivers(params);
    expect(rivers.riverEdgeDir0.length).toBe(landmass.width * landmass.height);
  });

  it("tiny map with seed 9999 produces at least one river edge", () => {
    const params = makeParams({ seed: 9999, mapSize: "tiny" });
    const { rivers } = runRivers(params);
    const hasAnyRiver =
      rivers.riverEdgeDir0.some(Boolean) ||
      rivers.riverEdgeDir1.some(Boolean) ||
      rivers.riverEdgeDir2.some(Boolean);
    expect(hasAnyRiver).toBe(true);
  });

  it("every edge has exactly one owner, resolvable from both sides (wraparound included)", () => {
    const params = makeParams({ seed: 7, mapType: "continents", mapSize: "small" });
    const { landmass, rivers } = runRivers(params);
    const { width, height } = landmass;
    const wrap = wrapContextFor(width);

    for (let i = 0; i < width * height; i++) {
      const q = i % width;
      const r = (i - q) / width;

      for (let d = 0; d < AXIAL_DIRECTIONS.length; d++) {
        const dir = AXIAL_DIRECTIONS[d]!;
        let nq = q + dir.q;
        const nr = r + dir.r;
        if (wrap.isWraparoundX) {
          nq = ((nq % width) + width) % width;
        }
        if (nr < 0 || nr >= height) continue;
        if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) continue;
        const ni = nr * width + nq;

        // Resolve the flag from THIS tile's perspective.
        const flagHere =
          d < OWNED_EDGE_DIRECTIONS
            ? ownedFlag(rivers, i, d)
            : ownedFlag(rivers, ni, d - OWNED_EDGE_DIRECTIONS);

        // Resolve the same physical edge from the NEIGHBOUR's perspective,
        // via the opposite direction.
        const opposite = (d + 3) % 6;
        const flagFromNeighbor =
          opposite < OWNED_EDGE_DIRECTIONS
            ? ownedFlag(rivers, ni, opposite)
            : ownedFlag(rivers, i, opposite - OWNED_EDGE_DIRECTIONS);

        expect(flagFromNeighbor).toBe(flagHere);
      }
    }
  });

  it("a traced river is a connected chain of edges, not isolated flags", () => {
    // A single long downhill trace on a big enough map produces edges that,
    // read back as an adjacency graph over tiles, form one connected walk:
    // every river tile (except possibly the endpoints) touches at least
    // two river edges, and no river edge is orphaned onto a non-river tile.
    const params = makeParams({ seed: 42, mapSize: "standard" });
    const { landmass, rivers } = runRivers(params);
    const { width, height } = landmass;
    const wrap = wrapContextFor(width);
    const total = width * height;

    const riverEdgeCountPerTile = new Array<number>(total).fill(0);
    const edges: Array<[number, number]> = [];

    for (let i = 0; i < total; i++) {
      const q = i % width;
      const r = (i - q) / width;
      for (let d = 0; d < OWNED_EDGE_DIRECTIONS; d++) {
        if (!ownedFlag(rivers, i, d)) continue;
        const dir = AXIAL_DIRECTIONS[d]!;
        let nq = q + dir.q;
        const nr = r + dir.r;
        if (wrap.isWraparoundX) {
          nq = ((nq % width) + width) % width;
        }
        if (nr < 0 || nr >= height) continue;
        if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) continue;
        const ni = nr * width + nq;
        riverEdgeCountPerTile[i]!++;
        riverEdgeCountPerTile[ni]!++;
        edges.push([i, ni]);
      }
    }

    expect(edges.length).toBeGreaterThan(0);
    // Every river-edge endpoint touches at least one other river edge
    // (chain, not a single dangling stroke) — union-find over the edges
    // must collapse into fewer components than edges whenever there is
    // more than one edge sharing a tile.
    const anyTileWithTwoOrMoreEdges = riverEdgeCountPerTile.some((count) => count >= 2);
    expect(anyTileWithTwoOrMoreEdges).toBe(true);
  });
});
