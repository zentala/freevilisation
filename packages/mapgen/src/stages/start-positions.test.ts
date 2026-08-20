import { describe, it, expect } from "vitest";
import { createPrng } from "@freevilisation/engine";
import { generateStartPositions } from "./start-positions.js";
import { generateLandmass } from "./landmass.js";
import { generateClimate, TERRAIN } from "./climate.js";
import { generateResources } from "./resources.js";
import type { MapGenParams } from "../pipeline.js";

function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return {
    seed: 12345,
    mapType: "continents",
    mapSize: "tiny",
    ...overrides,
  };
}

function runStartPositions(params: MapGenParams) {
  const landmassPrng = createPrng(params.seed).fork("landmass");
  const landmass = generateLandmass(params, { prng: landmassPrng, onProgress: () => {} });
  const climatePrng = createPrng(params.seed).fork("climate");
  const climate = generateClimate(params, landmass, { prng: climatePrng, onProgress: () => {} });
  const resourcesPrng = createPrng(params.seed).fork("resources");
  const resources = generateResources(params, climate, landmass, {
    prng: resourcesPrng,
    onProgress: () => {},
  });
  const startPositionsPrng = createPrng(params.seed).fork("start-positions");
  const startPositions = generateStartPositions(params, landmass, climate, resources, {
    prng: startPositionsPrng,
    onProgress: () => {},
  });
  return { landmass, climate, resources, startPositions };
}

function minPairwiseDistance(positions: { q: number; r: number }[]): number {
  let min = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i]!;
      const b = positions[j]!;
      const d = Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r));
      if (d < min) min = d;
    }
  }
  return min;
}

/**
 * Terrain quality, restated here as the test's oracle. It deliberately mirrors
 * the spec ("grassland best, desert/snow worst") rather than importing the
 * table from the source, so reversing the source's table shows up as a failure
 * instead of silently reversing the expectation too.
 */
const EXPECTED_QUALITY: Record<string, number> = {
  [TERRAIN.grassland]: 3,
  [TERRAIN.plains]: 2,
  [TERRAIN.tundra]: 1,
  [TERRAIN.desert]: 0,
  [TERRAIN.snow]: 0,
};

const ORTHOGONAL: ReadonlyArray<[number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

/** Oracle for one tile's score: base terrain quality + 1 per adjacent resource. */
function expectedScore(
  q: number,
  r: number,
  landmass: { width: number; height: number },
  climate: { terrainDefId: readonly (string | null)[] },
  resources: { resourceDefId: readonly (string | null)[] },
): number {
  const { width, height } = landmass;
  let score = EXPECTED_QUALITY[climate.terrainDefId[r * width + q]!] ?? 0;
  for (const [dq, dr] of ORTHOGONAL) {
    const nq = q + dq;
    const nr = r + dr;
    if (nq < 0 || nq >= width || nr < 0 || nr >= height) continue;
    if (resources.resourceDefId[nr * width + nq] !== null) score += 1;
  }
  return score;
}

/**
 * A hand-built map: every tile is land, every tile is desert, no resources.
 * Every tile therefore scores exactly 0, so the candidate pool can only be
 * "all of them" and farthest-point sampling must span the full height.
 */
function uniformMap(width: number, height: number) {
  const size = width * height;
  return {
    landmass: {
      width,
      height,
      elevation: new Array(size).fill(1),
      isLand: new Array(size).fill(true),
    },
    climate: { terrainDefId: new Array(size).fill(TERRAIN.desert) },
    resources: { resourceDefId: new Array(size).fill(null) },
  };
}

describe("generateStartPositions", () => {
  it("determinism: same seed and params produce byte-identical startPositions", () => {
    const params = makeParams({ numPlayers: 4 });
    const r1 = runStartPositions(params);
    const r2 = runStartPositions(params);
    expect(r1.startPositions.startPositions).toEqual(r2.startPositions.startPositions);
  });

  it.each([2, 4, 8])("returns numPlayers=%i positions on a standard map", (numPlayers) => {
    const params = makeParams({ mapSize: "standard", numPlayers });
    const { startPositions } = runStartPositions(params);
    expect(startPositions.startPositions.length).toBe(numPlayers);
  });

  it("every returned position lands on a land tile", () => {
    const params = makeParams({ mapSize: "standard", numPlayers: 6 });
    const { landmass, startPositions } = runStartPositions(params);
    for (const { q, r } of startPositions.startPositions) {
      expect(landmass.isLand[r * landmass.width + q]).toBe(true);
    }
  });

  it("no two returned positions are identical", () => {
    const params = makeParams({ mapSize: "standard", numPlayers: 8 });
    const { startPositions } = runStartPositions(params);
    const seen = new Set<string>();
    for (const { q, r } of startPositions.startPositions) {
      const key = `${q},${r}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("never throws and always returns the requested count on a tiny map with a high player count", () => {
    const params = makeParams({ mapSize: "tiny", numPlayers: 8 });
    expect(() => runStartPositions(params)).not.toThrow();
    const { startPositions } = runStartPositions(params);
    expect(startPositions.startPositions.length).toBe(8);
  });

  it("omitting numPlayers defaults to 4", () => {
    const params = makeParams();
    const { startPositions } = runStartPositions(params);
    expect(startPositions.startPositions.length).toBe(4);
  });

  it("different seeds produce different startPositions", () => {
    const r1 = runStartPositions(makeParams({ seed: 7 }));
    const r2 = runStartPositions(makeParams({ seed: 8 }));
    expect(r1.startPositions.startPositions).not.toEqual(r2.startPositions.startPositions);
  });

  it("minimum pairwise Chebyshev distance has a floor", () => {
    const params = makeParams({ mapSize: "standard", numPlayers: 4 });
    const { startPositions } = runStartPositions(params);
    const d = minPairwiseDistance(startPositions.startPositions);
    expect(d).toBeGreaterThanOrEqual(2);
  });

  it("tiny pool: quality floor relaxation returns numPlayers when enough land tiles exist", () => {
    const params = makeParams({ mapSize: "tiny", numPlayers: 2 });
    const { startPositions } = runStartPositions(params);
    expect(startPositions.startPositions.length).toBe(2);
  });

  it("impossible map: throws when fewer land tiles than players", () => {
    const minimalLandmass = {
      width: 5,
      height: 5,
      elevation: new Array(25),
      isLand: new Array(25).fill(false),
    };
    const params: MapGenParams = {
      seed: 12345,
      mapType: "continents",
      mapSize: "tiny",
      numPlayers: 30,
    };
    expect(() =>
      generateStartPositions(params, minimalLandmass, {
        terrainDefId: new Array(25).fill(null) as any,
      } as any, {
        resourceDefId: new Array(25).fill(null) as any,
      } as any, {
        prng: createPrng(12345).fork("test"),
        onProgress: () => {},
      }),
    ).toThrow("Cannot place 30 players on a map with");
  });

  it("relaxes the quality floor instead of dumping the whole landmass into the pool", () => {
    // 300 players on tiny: the quality>=3 pool (267 tiles) is too small, so the
    // floor must relax to 2 (375 tiles). If relaxation is skipped, the code falls
    // straight through to every land tile and picks quality-0 ground.
    const params = makeParams({ mapSize: "tiny", numPlayers: 300 });
    const { landmass, climate, resources, startPositions } = runStartPositions(params);
    const scores = startPositions.startPositions.map(({ q, r }) =>
      expectedScore(q, r, landmass, climate, resources),
    );
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(2);
  });

  it("prefers high-quality terrain: no start position lands on desert or snow", () => {
    const params = makeParams({ mapSize: "standard", numPlayers: 8 });
    const { landmass, climate, startPositions } = runStartPositions(params);
    const chosen = startPositions.startPositions.map(
      ({ q, r }) => climate.terrainDefId[r * landmass.width + q],
    );
    expect(chosen).not.toContain(TERRAIN.desert);
    expect(chosen).not.toContain(TERRAIN.snow);
    for (const terrain of chosen) {
      expect(EXPECTED_QUALITY[terrain!]).toBeGreaterThanOrEqual(2);
    }
  });

  it("scores edge tiles without reading past the tile array", () => {
    // Every tile is identical, so every tile must score the same and the pool must
    // be the whole map — two players then land at opposite ends of a 2x6 strip.
    // An out-of-bounds neighbour read gives the bottom row a phantom bonus, which
    // shrinks the pool to that row and collapses the spread.
    const { landmass, climate, resources } = uniformMap(2, 6);
    const params: MapGenParams = {
      seed: 12345,
      mapType: "continents",
      mapSize: "tiny",
      numPlayers: 2,
    };
    const { startPositions } = generateStartPositions(
      params,
      landmass,
      climate as never,
      resources as never,
      { prng: createPrng(params.seed).fork("start-positions"), onProgress: () => {} },
    );
    expect(minPairwiseDistance(startPositions)).toBe(5);
  });
});
