import { describe, it, expect } from "vitest";
import { createPrng } from "@freevilisation/engine";
import { generateStartPositions, placeStartPositions } from "./start-positions.js";
import { TERRAIN } from "./climate.js";
import {
  makeParams,
  runStartPositions,
  minPairwiseHexDistance,
  expectedScore,
  uniformMap,
  byPosition,
  wrapContextFor,
  flatWrap,
  EXPECTED_QUALITY,
} from "./start-positions.test-fixtures.js";

describe("generateStartPositions — terrain and resource quality", () => {
  it("relaxes the quality floor instead of dumping the whole landmass into the pool", () => {
    // 300 players on tiny: the quality>=3 pool (267 tiles) is too small, so the
    // floor must relax to 2 (375 tiles). If relaxation is skipped, the code falls
    // straight through to every land tile and picks quality-0 ground.
    const params = makeParams({ mapSize: "tiny", numPlayers: 300 });
    const { landmass, climate, resources, startPositions } = runStartPositions(params);
    const wrap = wrapContextFor(landmass.width);
    const scores = startPositions.startPositions.map(({ q, r }) =>
      expectedScore(q, r, landmass, climate, resources, wrap),
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
    // be the whole map — two players then land at the two corners hex-farthest
    // apart on a 2x6 strip: hex distance 6 (dq=1, dr=5, and the two axial deltas
    // share sign, so they add instead of capping at the larger axis). An
    // out-of-bounds neighbour read gives the bottom row a phantom bonus, which
    // shrinks the pool to that row and collapses the spread.
    const { landmass, climate, resources } = uniformMap(2, 6);
    const seed = 12345;
    const wrap = flatWrap(landmass.width);
    const { startPositions } = placeStartPositions(
      landmass,
      climate as never,
      resources as never,
      { prng: createPrng(seed).fork("start-positions"), onProgress: () => {} },
      wrap,
      2,
    );
    expect(minPairwiseHexDistance(startPositions, wrap)).toBe(6);
  });

  it("keeps a floor whose pool exactly matches numPlayers instead of relaxing past it", () => {
    // Exactly three tiles clear the initial floor of 3. Requiring *more* than
    // numPlayers rather than at least numPlayers relaxes all the way to 0 and
    // drags the whole desert into the pool.
    const width = 6;
    const height = 6;
    const size = width * height;
    const terrainDefId = new Array(size).fill(TERRAIN.desert);
    const goodTiles = [
      { q: 0, r: 0 },
      { q: 5, r: 0 },
      { q: 0, r: 5 },
    ];
    for (const { q, r } of goodTiles) terrainDefId[r * width + q] = TERRAIN.grassland;

    const { startPositions } = generateStartPositions(
      { seed: 12345, mapType: "archipelago", mapSize: "tiny", numPlayers: 3 },
      { width, height, elevation: new Array(size).fill(1), isLand: new Array(size).fill(true) },
      { terrainDefId } as never,
      { resourceDefId: new Array(size).fill(null) } as never,
      { prng: createPrng(12345).fork("start-positions"), onProgress: () => {} },
    );

    expect(startPositions.length).toBe(3);
    expect([...startPositions].sort(byPosition)).toEqual([...goodTiles].sort(byPosition));
  });

  it("places players when the land tile count exactly equals numPlayers", () => {
    // Ocean terrain carries no quality entry, so the quality pool stays empty
    // and selection falls through to every land tile - exactly three of them
    // for three players. The error is for *fewer* land tiles than players;
    // an equal count must still succeed.
    const width = 3;
    const height = 3;
    const size = width * height;
    const isLand = new Array(size).fill(false);
    for (const { q, r } of [
      { q: 0, r: 0 },
      { q: 2, r: 0 },
      { q: 0, r: 2 },
    ]) {
      isLand[r * width + q] = true;
    }
    const { startPositions } = generateStartPositions(
      { seed: 1, mapType: "archipelago", mapSize: "tiny", numPlayers: 3 },
      { width, height, elevation: new Array(size).fill(1), isLand },
      { terrainDefId: new Array(size).fill(TERRAIN.ocean) } as never,
      { resourceDefId: new Array(size).fill(null) } as never,
      { prng: { next: () => 0 } as unknown as ReturnType<typeof createPrng>, onProgress: () => {} },
    );
    expect(startPositions.length).toBe(3);
  });

  it("ranks plains below grassland: three grassland tiles keep the floor at 3", () => {
    // Grassland clears the initial floor of 3 and plains does not, so three
    // grassland tiles are the whole pool and the far corners never come up.
    // Score plains as high as grassland and the pool grows to six, pulling a
    // corner in as the farthest point.
    const width = 7;
    const height = 7;
    const size = width * height;
    const terrainDefId = new Array(size).fill(TERRAIN.desert);
    for (const q of [0, 1, 2]) terrainDefId[q] = TERRAIN.grassland;
    for (const { q, r } of [
      { q: 6, r: 0 },
      { q: 0, r: 6 },
      { q: 6, r: 6 },
    ]) {
      terrainDefId[r * width + q] = TERRAIN.plains;
    }

    const { startPositions } = generateStartPositions(
      { seed: 1, mapType: "archipelago", mapSize: "tiny", numPlayers: 3 },
      { width, height, elevation: new Array(size).fill(1), isLand: new Array(size).fill(true) },
      { terrainDefId } as never,
      { resourceDefId: new Array(size).fill(null) } as never,
      { prng: { next: () => 0 } as unknown as ReturnType<typeof createPrng>, onProgress: () => {} },
    );

    expect([...startPositions].sort(byPosition)).toEqual([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ]);
  });

  it("ranks tundra above desert: the floor stops at 1 instead of falling to 0", () => {
    // One grassland, one plains and three tundra tiles reach four players only
    // once the floor drops to 1 - which needs tundra to score above desert.
    // Score tundra as desert and the floor falls to 0, handing the whole 7x7
    // desert to the sampler, which then takes the far corners.
    const width = 7;
    const height = 7;
    const size = width * height;
    const terrainDefId = new Array(size).fill(TERRAIN.desert);
    terrainDefId[0] = TERRAIN.grassland;
    terrainDefId[1] = TERRAIN.plains;
    terrainDefId[2] = TERRAIN.tundra;
    terrainDefId[3] = TERRAIN.tundra;
    terrainDefId[4] = TERRAIN.tundra;

    const { startPositions } = generateStartPositions(
      { seed: 1, mapType: "archipelago", mapSize: "tiny", numPlayers: 4 },
      { width, height, elevation: new Array(size).fill(1), isLand: new Array(size).fill(true) },
      { terrainDefId } as never,
      { resourceDefId: new Array(size).fill(null) } as never,
      { prng: { next: () => 0 } as unknown as ReturnType<typeof createPrng>, onProgress: () => {} },
    );
    for (const { r } of startPositions) expect(r).toBe(0);
  });
});
