import { describe, it, expect } from "vitest";
import { createPrng, neighbors, type TerrainDefId } from "@freevilisation/engine";
import { generateWater } from "./water.js";
import { TERRAIN } from "./climate.js";
import type { LandmassResult } from "./landmass.js";
import type { ClimateResult } from "./climate.js";
import type { MapGenParams, StageContext } from "../pipeline.js";
import { wrapContextFor } from "../config.js";
import { multiSourceDistance, type FloodGrid } from "../flood.js";

function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return { seed: 1, mapType: "continents", mapSize: "tiny", ...overrides };
}

/** `generateWater` reads no randomness, but `StageContext` still requires a `Prng`. */
const CTX: StageContext = { prng: createPrng(1), onProgress: () => {} };

/** Builds a map with land filling `landBox` and ocean everywhere else. */
function buildIsland(
  width: number,
  height: number,
  landBox: { q0: number; q1: number; r0: number; r1: number },
): { landmass: LandmassResult; climate: ClimateResult } {
  const total = width * height;
  const isLand = new Array<boolean>(total).fill(false);
  for (let r = landBox.r0; r <= landBox.r1; r++) {
    for (let q = landBox.q0; q <= landBox.q1; q++) {
      isLand[r * width + q] = true;
    }
  }
  const terrainDefId = isLand.map((land) => (land ? TERRAIN.grassland : TERRAIN.ocean));
  return {
    landmass: { width, height, elevation: new Array<number>(total).fill(0.5), isLand },
    climate: { terrainDefId },
  };
}

describe("generateWater — coastal shelf (E55-W1-T03)", () => {
  it("every coast tile borders land, and no land tile borders plain ocean directly", () => {
    const width = 15;
    const height = 15;
    const { landmass, climate } = buildIsland(width, height, { q0: 5, q1: 9, r0: 5, r1: 9 });
    const result = generateWater(makeParams(), landmass, climate, CTX);
    const wrap = wrapContextFor(width);

    let coastCount = 0;
    let oceanCount = 0;
    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const idx = r * width + q;
        const terrain = result.terrainDefId[idx];

        if (terrain === TERRAIN.coast) {
          coastCount++;
          const hasLandNeighbor = neighbors({ q, r }, wrap).some(({ q: nq, r: nr }) => {
            if (nr < 0 || nr >= height) return false;
            if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) return false;
            return landmass.isLand[nr * width + nq]!;
          });
          expect(hasLandNeighbor).toBe(true);
        }
        if (terrain === TERRAIN.ocean) oceanCount++;

        if (!landmass.isLand[idx]!) continue;
        for (const { q: nq, r: nr } of neighbors({ q, r }, wrap)) {
          if (nr < 0 || nr >= height) continue;
          if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) continue;
          const nIdx = nr * width + nq;
          if (!landmass.isLand[nIdx]!) {
            expect(result.terrainDefId[nIdx]).not.toBe(TERRAIN.ocean);
          }
        }
      }
    }
    expect(coastCount).toBeGreaterThan(0);
    expect(oceanCount).toBeGreaterThan(0);
  });

  it("distanceToLand is stored per tile and matches an independently computed BFS", () => {
    const width = 9;
    const height = 9;
    const { landmass, climate } = buildIsland(width, height, { q0: 4, q1: 4, r0: 4, r1: 4 });
    const result = generateWater(makeParams(), landmass, climate, CTX);

    const grid: FloodGrid = { width, height, wrap: wrapContextFor(width) };
    const landSeeds: number[] = [];
    for (let i = 0; i < landmass.isLand.length; i++) if (landmass.isLand[i]!) landSeeds.push(i);
    const expected = multiSourceDistance(grid, landSeeds);

    expect(result.distanceToLand).toEqual(expected);
    expect(result.distanceToLand[4 * width + 4]).toBe(0);
    expect(Math.max(...result.distanceToLand)).toBeGreaterThan(1);
  });

  it("the distance-to-land BFS treats the east-west seam as adjacent, not a hard edge", () => {
    const width = 10;
    const height = 5;
    const total = width * height;
    const isLand = new Array<boolean>(total).fill(false);
    const landIdx = 2 * width + 0; // land at the west edge (q=0)
    isLand[landIdx] = true;
    const terrainDefId = new Array<TerrainDefId>(total).fill(TERRAIN.ocean);
    terrainDefId[landIdx] = TERRAIN.grassland;
    const landmass: LandmassResult = {
      width,
      height,
      elevation: new Array<number>(total).fill(0.5),
      isLand,
    };
    const climate: ClimateResult = { terrainDefId };

    const result = generateWater(makeParams(), landmass, climate, CTX);

    // q = width-1 is the east edge, wrap-adjacent to q = 0 on the same row —
    // one hex step across the seam, not the long way around the map.
    const seamIdx = 2 * width + (width - 1);
    expect(result.distanceToLand[seamIdx]).toBe(1);
    expect(result.terrainDefId[seamIdx]).toBe(TERRAIN.coast);
  });
});
