import { describe, it, expect } from "vitest";
import { createPrng, type TerrainDefId } from "@freevilisation/engine";
import { generateWater, TERRAIN_LAKE, FEATURE_ICE } from "./water.js";
import { TERRAIN } from "./climate.js";
import type { LandmassResult } from "./landmass.js";
import type { ClimateResult } from "./climate.js";
import type { MapGenParams, StageContext } from "../pipeline.js";
import { MAP_TYPE_PRESETS } from "../config.js";
import { floodComponents, type FloodGrid } from "../flood.js";

function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return { seed: 1, mapType: "continents", mapSize: "tiny", ...overrides };
}

/** `generateWater` reads no randomness, but `StageContext` still requires a `Prng`. */
const CTX: StageContext = { prng: createPrng(1), onProgress: () => {} };

/** Builds a fully-land map, then carves water at the given tile indices. */
function buildMap(
  width: number,
  height: number,
  waterIndices: readonly number[],
): { landmass: LandmassResult; climate: ClimateResult } {
  const total = width * height;
  const isLand = new Array<boolean>(total).fill(true);
  const terrainDefId = new Array<TerrainDefId>(total).fill(TERRAIN.grassland);
  for (const idx of waterIndices) {
    isLand[idx] = false;
    terrainDefId[idx] = TERRAIN.coast; // every carved tile here borders land
  }
  return {
    landmass: { width, height, elevation: new Array<number>(total).fill(0.5), isLand },
    climate: { terrainDefId },
  };
}

describe("generateWater — lake vs ocean", () => {
  it("determinism: same inputs produce byte-identical terrainDefId", () => {
    const { landmass, climate } = buildMap(5, 5, [12]); // centre tile
    const params = makeParams();
    const r1 = generateWater(params, landmass, climate, CTX);
    const r2 = generateWater(params, landmass, climate, CTX);
    expect(r1.terrainDefId).toEqual(r2.terrainDefId);
  });

  it("a single enclosed water tile away from the map edge becomes terrain_lake", () => {
    const { landmass, climate } = buildMap(5, 5, [12]); // (q=2,r=2), the centre
    const result = generateWater(makeParams(), landmass, climate, CTX);
    expect(result.terrainDefId[12]).toBe(TERRAIN_LAKE);
    for (let i = 0; i < result.terrainDefId.length; i++) {
      if (i === 12) continue;
      expect(result.terrainDefId[i]).toBe(TERRAIN.grassland);
    }
  });

  it("a water tile on the north (or south) row stays ocean, never a lake", () => {
    // row 0 is index 0..4 on a width-5 map; index 2 is the top row, middle column.
    const { landmass, climate } = buildMap(5, 5, [2]);
    const result = generateWater(makeParams(), landmass, climate, CTX);
    expect(result.terrainDefId[2]).toBe(TERRAIN.coast);
    expect(result.terrainDefId[2]).not.toBe(TERRAIN_LAKE);
  });

  it("a component sized exactly at maxLakeSize stays ocean; one tile smaller becomes a lake", () => {
    const maxLakeSize = MAP_TYPE_PRESETS.islands.maxLakeSize;
    const width = 25;
    const height = 5;
    const row = 2; // interior row, not touching north/south edges

    const atThreshold: number[] = [];
    for (let q = 2; q < 2 + maxLakeSize; q++) atThreshold.push(row * width + q);
    const belowThreshold = atThreshold.slice(0, maxLakeSize - 1);

    const params = makeParams({ mapType: "islands" });

    const at = buildMap(width, height, atThreshold);
    const atResult = generateWater(params, at.landmass, at.climate, CTX);
    for (const idx of atThreshold) expect(atResult.terrainDefId[idx]).not.toBe(TERRAIN_LAKE);

    const below = buildMap(width, height, belowThreshold);
    const belowResult = generateWater(params, below.landmass, below.climate, CTX);
    for (const idx of belowThreshold) expect(belowResult.terrainDefId[idx]).toBe(TERRAIN_LAKE);
  });

  it("at least one ocean component spans/touches a map edge and is never reclassified", () => {
    const width = 6;
    const height = 6;
    const edgeRow: number[] = [];
    for (let q = 0; q < width; q++) edgeRow.push(0 * width + q); // whole top row is water
    const { landmass, climate } = buildMap(width, height, edgeRow);
    const result = generateWater(makeParams(), landmass, climate, CTX);
    for (const idx of edgeRow) expect(result.terrainDefId[idx]).not.toBe(TERRAIN_LAKE);
  });

  it("a body that only forms one large component through east-west wraparound is not misread as a lake", () => {
    // Two water arcs on an interior row, joined into one 26-tile body only
    // by the cylinder seam (q=width-1 wraps to q=0) — each arc alone (13
    // tiles) is under continents' maxLakeSize (25), but merged they are not.
    const width = 30;
    const height = 5;
    const row = 2;
    const arcA = Array.from({ length: 13 }, (_, i) => row * width + i); // q 0..12
    const arcB = Array.from({ length: 13 }, (_, i) => row * width + (17 + i)); // q 17..29
    const waterIndices = [...arcA, ...arcB];
    const { landmass, climate } = buildMap(width, height, waterIndices);

    const result = generateWater(makeParams({ mapType: "continents" }), landmass, climate, CTX);
    for (const idx of waterIndices) expect(result.terrainDefId[idx]).not.toBe(TERRAIN_LAKE);
  });
});

describe("wraparound regression — the seam the epic calls out", () => {
  it("without a wrapping context, the same 26-tile ring splits into two lake-sized halves", () => {
    const width = 30;
    const height = 5;
    const row = 2;
    const arcA = new Set(Array.from({ length: 13 }, (_, i) => row * width + i));
    const arcB = new Set(Array.from({ length: 13 }, (_, i) => row * width + (17 + i)));
    const isWater = (idx: number): boolean => arcA.has(idx) || arcB.has(idx);

    const wrapping: FloodGrid = { width, height, wrap: { isWraparoundX: true, width } };
    const wrapped = floodComponents(wrapping, isWater);
    expect(wrapped.componentSize).toEqual([26]);

    const nonWrapping: FloodGrid = { width, height, wrap: { isWraparoundX: false, width } };
    const notWrapped = floodComponents(nonWrapping, isWater);
    // This is the bug the epic warns about: split into two components, each
    // under continents' maxLakeSize (25) — a wrap-blind fill would call both
    // of these "lakes", when they are really one arm of the world ocean.
    expect(notWrapped.componentSize.sort((a, b) => a - b)).toEqual([13, 13]);
    for (const size of notWrapped.componentSize) {
      expect(size).toBeLessThan(MAP_TYPE_PRESETS.continents.maxLakeSize);
    }
  });
});

/** Builds an all-ocean map (no land at all) of the given size. */
function buildOceanMap(
  width: number,
  height: number,
): { landmass: LandmassResult; climate: ClimateResult } {
  const total = width * height;
  return {
    landmass: {
      width,
      height,
      elevation: new Array<number>(total).fill(0.1),
      isLand: new Array<boolean>(total).fill(false),
    },
    climate: { terrainDefId: new Array<TerrainDefId>(total).fill(TERRAIN.ocean) },
  };
}

describe("generateWater — polar ice", () => {
  it("places ice at the poles and never near the equator", () => {
    const width = 20;
    const height = 40;
    const { landmass, climate } = buildOceanMap(width, height);
    const result = generateWater(makeParams({ mapType: "islands" }), landmass, climate, CTX);

    // Row 0 is the pole (poleward latitude 0.975) — well above every map
    // type's threshold even at the noise's maximum perturbation (0.12).
    for (let q = 0; q < width; q++) expect(result.featureDefId[0 * width + q]).toBe(FEATURE_ICE);

    // The equator row has poleward latitude 0 — never ice, regardless of noise.
    const equatorRow = 19;
    for (let q = 0; q < width; q++) expect(result.featureDefId[equatorRow * width + q]).toBeNull();
  });

  it("the ice/no-ice transition row is not the same for every q — a ragged boundary, not a straight line", () => {
    const width = 20;
    const height = 40;
    const { landmass, climate } = buildOceanMap(width, height);
    const result = generateWater(makeParams({ mapType: "continents" }), landmass, climate, CTX);

    const iceExtentByQ: number[] = [];
    for (let q = 0; q < width; q++) {
      let extent = 0;
      for (let r = 0; r < height; r++) {
        if (result.featureDefId[r * width + q] === FEATURE_ICE) extent++;
      }
      iceExtentByQ.push(extent);
    }
    expect(Math.max(...iceExtentByQ)).not.toBe(Math.min(...iceExtentByQ));
  });

  it("a lake never gets ice, even at the pole", () => {
    const width = 20;
    const height = 40;
    // Row 1 (poleward latitude 0.925, safely above every threshold) — a
    // single water tile at q=5, walled in by land on all six hex
    // neighbours, so it is its own 1-tile component, non-edge, and small
    // enough to become a lake.
    const lakeIdx = 1 * width + 5;
    const { landmass, climate } = buildMap(width, height, [lakeIdx]);
    const params = makeParams({ mapType: "islands" });

    const result = generateWater(params, landmass, climate, CTX);
    expect(result.terrainDefId[lakeIdx]).toBe(TERRAIN_LAKE);
    expect(result.featureDefId[lakeIdx]).toBeNull();
  });

  it("an ocean tile at the same high latitude as a lake still gets ice", () => {
    const width = 20;
    const height = 40;
    const { landmass, climate } = buildOceanMap(width, height);
    const result = generateWater(makeParams({ mapType: "islands" }), landmass, climate, CTX);
    expect(result.featureDefId[1 * width + 5]).toBe(FEATURE_ICE);
  });
});

describe("generateWater — polar ice, wraparound", () => {
  it("ice classification is consistent across the east-west seam for a wrap-joined ocean body", () => {
    // Two water arcs on a high-latitude row, joined into one component only
    // through the cylinder seam (mirrors the lake wraparound test above),
    // to prove the wrap-aware flood fill keeps this ocean (not a lake) so
    // ice can apply to it — including the tiles that sit right at the seam.
    const width = 30;
    const height = 40;
    const row = 1; // poleward latitude 0.925 — safely above every threshold
    const total = width * height;
    const isLand = new Array<boolean>(total).fill(true);
    const terrainDefId = new Array<TerrainDefId>(total).fill(TERRAIN.grassland);
    const arcA = Array.from({ length: 13 }, (_, i) => row * width + i); // q 0..12
    const arcB = Array.from({ length: 13 }, (_, i) => row * width + (17 + i)); // q 17..29
    for (const idx of [...arcA, ...arcB]) {
      isLand[idx] = false;
      terrainDefId[idx] = TERRAIN.ocean;
    }
    const landmass: LandmassResult = {
      width,
      height,
      elevation: new Array<number>(total).fill(0.5),
      isLand,
    };
    const climate: ClimateResult = { terrainDefId };

    const result = generateWater(makeParams({ mapType: "islands" }), landmass, climate, CTX);

    // Not reclassified as a lake — same assertion the T01 wraparound test makes.
    for (const idx of [...arcA, ...arcB]) expect(result.terrainDefId[idx]).not.toBe(TERRAIN_LAKE);
    // The seam tiles (q = 29 and q = 0, adjacent across the wrap) both get ice.
    expect(result.featureDefId[row * width + 29]).toBe(FEATURE_ICE);
    expect(result.featureDefId[row * width + 0]).toBe(FEATURE_ICE);
  });
});
