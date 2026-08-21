import { describe, it, expect } from "vitest";
import { createPrng } from "@freevilisation/engine";
import { generateStartPositions } from "./start-positions.js";
import { generateLandmass } from "./landmass.js";
import { generateClimate, TERRAIN } from "./climate.js";
import { generateResources } from "./resources.js";
import { generateMap } from "../pipeline.js";
import type { MapGenParams } from "../pipeline.js";
import type { TerrainDefId } from "@freevilisation/engine";

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

/**
 * A PRNG handing out a fixed sequence of draws, repeating the last one once
 * exhausted. Pinning the draws is the only way to tell "picked at random among
 * equals" apart from "always picked the first one".
 */
function scriptedPrng(values: readonly number[]): ReturnType<typeof createPrng> {
  let i = 0;
  return {
    next: () => values[Math.min(i++, values.length - 1)]!,
  } as unknown as ReturnType<typeof createPrng>;
}

/**
 * Place `numPlayers` on a map built by hand: `land` lists the only land tiles,
 * every one of them carrying `terrain`, with no resources anywhere.
 */
function placeOnHandMadeMap(
  width: number,
  height: number,
  land: readonly { q: number; r: number }[],
  terrain: TerrainDefId,
  numPlayers: number,
  draws: readonly number[],
) {
  const size = width * height;
  const isLand = new Array(size).fill(false);
  for (const { q, r } of land) isLand[r * width + q] = true;
  return generateStartPositions(
    { seed: 1, mapType: "continents", mapSize: "tiny", numPlayers },
    { width, height, elevation: new Array(size).fill(1), isLand },
    { terrainDefId: new Array(size).fill(terrain) } as never,
    { resourceDefId: new Array(size).fill(null) } as never,
    { prng: scriptedPrng(draws), onProgress: () => {} },
  ).startPositions;
}

/**
 * Every tile is land and desert, except the tiles named in `terrain`. Resource
 * tiles are named separately, since a resource lifts its *neighbours* score,
 * not its own.
 */
function placeOnPaintedMap(
  width: number,
  height: number,
  terrain: ReadonlyArray<{ q: number; r: number; id: TerrainDefId }>,
  resources: ReadonlyArray<{ q: number; r: number }>,
  numPlayers: number,
  draws: readonly number[],
) {
  const size = width * height;
  const terrainDefId = new Array(size).fill(TERRAIN.desert);
  for (const { q, r, id } of terrain) terrainDefId[r * width + q] = id;
  const resourceDefId = new Array(size).fill(null);
  for (const { q, r } of resources) resourceDefId[r * width + q] = "resource_probe";
  return generateStartPositions(
    { seed: 1, mapType: "continents", mapSize: "tiny", numPlayers },
    { width, height, elevation: new Array(size).fill(1), isLand: new Array(size).fill(true) },
    { terrainDefId } as never,
    { resourceDefId } as never,
    { prng: scriptedPrng(draws), onProgress: () => {} },
  ).startPositions;
}

/** Sort helper so a set of positions can be compared regardless of pick order. */
function byPosition(a: { q: number; r: number }, b: { q: number; r: number }): number {
  return a.r - b.r || a.q - b.q;
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
    ).toThrow(
      "Cannot place 30 players on a map with 0 land tiles; " +
        "place fewer players or use a larger map.",
    );
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
      { seed: 12345, mapType: "continents", mapSize: "tiny", numPlayers: 3 },
      { width, height, elevation: new Array(size).fill(1), isLand: new Array(size).fill(true) },
      { terrainDefId } as never,
      { resourceDefId: new Array(size).fill(null) } as never,
      { prng: createPrng(12345).fork("start-positions"), onProgress: () => {} },
    );

    expect(startPositions.length).toBe(3);
    expect([...startPositions].sort(byPosition)).toEqual([...goodTiles].sort(byPosition));
  });

  it("ranks candidates by Chebyshev distance, not Manhattan", () => {
    // Four land tiles on an otherwise empty map, with a PRNG pinned to 0 so the
    // first pick is the scan-order first tile, (0,0). Measured from there:
    //   (4,0) Chebyshev 4, Manhattan 4
    //   (3,3) Chebyshev 3, Manhattan 6
    //   (0,5) Chebyshev 5, Manhattan 5
    // Chebyshev therefore takes (0,5); Manhattan would take (3,3).
    const width = 5;
    const height = 6;
    const size = width * height;
    const isLand = new Array(size).fill(false);
    for (const { q, r } of [
      { q: 0, r: 0 },
      { q: 4, r: 0 },
      { q: 3, r: 3 },
      { q: 0, r: 5 },
    ]) {
      isLand[r * width + q] = true;
    }

    const { startPositions } = generateStartPositions(
      { seed: 1, mapType: "continents", mapSize: "tiny", numPlayers: 2 },
      { width, height, elevation: new Array(size).fill(1), isLand },
      { terrainDefId: new Array(size).fill(TERRAIN.desert) } as never,
      { resourceDefId: new Array(size).fill(null) } as never,
      {
        // A PRNG pinned to 0 makes both the first pick and every tie-break index 0.
        prng: { next: () => 0 } as unknown as ReturnType<typeof createPrng>,
        onProgress: () => {},
      },
    );

    expect(startPositions).toEqual([
      { q: 0, r: 0 },
      { q: 0, r: 5 },
    ]);
  });

  it("spreads players apart instead of clustering them next to each other", () => {
    // Land only at q = 0, 1, 5 and 9 of a one-row strip, first pick pinned to
    // (0,0). Farthest-point sampling takes (9,0) and then (5,0), the tile whose
    // *nearest* neighbour is furthest away. Maximising the distance to the
    // furthest chosen tile instead would take (1,0) and pack two players into
    // adjacent tiles.
    const positions = placeOnHandMadeMap(
      10,
      1,
      [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 5, r: 0 },
        { q: 9, r: 0 },
      ],
      TERRAIN.desert,
      3,
      [0],
    );
    expect(positions).toEqual([
      { q: 0, r: 0 },
      { q: 9, r: 0 },
      { q: 5, r: 0 },
    ]);
  });

  it("breaks a distance tie with the PRNG, not with array order", () => {
    // From (0,0) both (4,0) and (0,4) sit at distance 4. A draw of 0.9 across
    // the two tied tiles must land on the second one; always taking the first
    // tied index gives every map a north-west bias.
    const positions = placeOnHandMadeMap(
      5,
      5,
      [
        { q: 0, r: 0 },
        { q: 4, r: 0 },
        { q: 0, r: 4 },
      ],
      TERRAIN.desert,
      2,
      [0, 0.9],
    );
    expect(positions).toEqual([
      { q: 0, r: 0 },
      { q: 0, r: 4 },
    ]);
  });

  it("takes the first position from the PRNG draw, not from scan order", () => {
    // Three candidates in row-major order; a draw of 0.9 selects the third.
    const positions = placeOnHandMadeMap(
      5,
      5,
      [
        { q: 0, r: 0 },
        { q: 4, r: 0 },
        { q: 0, r: 4 },
      ],
      TERRAIN.desert,
      1,
      [0.9],
    );
    expect(positions).toEqual([{ q: 0, r: 4 }]);
  });

  it("places players when the land tile count exactly equals numPlayers", () => {
    // Ocean terrain carries no quality entry, so the quality pool stays empty
    // and selection falls through to every land tile - exactly three of them
    // for three players. The error is for *fewer* land tiles than players;
    // an equal count must still succeed.
    const positions = placeOnHandMadeMap(
      3,
      3,
      [
        { q: 0, r: 0 },
        { q: 2, r: 0 },
        { q: 0, r: 2 },
      ],
      TERRAIN.ocean,
      3,
      [0],
    );
    expect(positions.length).toBe(3);
  });

  it("never treats a water-terrain tile as a candidate, however well it scores", () => {
    // A one-row strip where every tile is land but the leftmost carries coast
    // terrain. The resource on q=1 lifts both its neighbours to quality 1, so
    // the coast tile outscores three of the four deserts and would win a place
    // if it were allowed into the pool at all. It must not be: the deserts get
    // both slots, and the floor relaxes to 0 to find them.
    const width = 5;
    const terrainDefId = [
      TERRAIN.coast,
      TERRAIN.desert,
      TERRAIN.desert,
      TERRAIN.desert,
      TERRAIN.desert,
    ];
    const resourceDefId = [null, "resource_probe", null, null, null];

    const { startPositions } = generateStartPositions(
      { seed: 1, mapType: "continents", mapSize: "tiny", numPlayers: 2 },
      { width, height: 1, elevation: new Array(width).fill(1), isLand: new Array(width).fill(true) },
      { terrainDefId } as never,
      { resourceDefId } as never,
      { prng: scriptedPrng([0]), onProgress: () => {} },
    );

    expect(startPositions).toEqual([
      { q: 1, r: 0 },
      { q: 4, r: 0 },
    ]);
  });

  it("counts the tile directly below as a neighbour, not the one diagonally below", () => {
    // A one-column strip, so left/right offsets are always out of bounds and only
    // the vertical pair can score anything. The resource at (0,1) lifts (0,0) and
    // (0,2) to quality 1, and those two are exactly the pool for two players. Turn
    // the downward offset diagonal and (0,0) drops to 0, the floor relaxes to 0,
    // and the pick spreads to the far end of the strip instead.
    const positions = placeOnPaintedMap(1, 5, [], [{ q: 0, r: 1 }], 2, [0]);
    expect(positions).toEqual([
      { q: 0, r: 0 },
      { q: 0, r: 2 },
    ]);
  });

  it("ranks plains below grassland: three grassland tiles keep the floor at 3", () => {
    // Grassland clears the initial floor of 3 and plains does not, so three
    // grassland tiles are the whole pool and the far corners never come up.
    // Score plains as high as grassland and the pool grows to six, pulling a
    // corner in as the farthest point.
    const grass = [0, 1, 2].map((q) => ({ q, r: 0, id: TERRAIN.grassland }));
    const plains = [
      { q: 6, r: 0, id: TERRAIN.plains },
      { q: 0, r: 6, id: TERRAIN.plains },
      { q: 6, r: 6, id: TERRAIN.plains },
    ];
    const positions = placeOnPaintedMap(7, 7, [...grass, ...plains], [], 3, [0]);
    expect([...positions].sort(byPosition)).toEqual([
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
    const painted = [
      { q: 0, r: 0, id: TERRAIN.grassland },
      { q: 1, r: 0, id: TERRAIN.plains },
      { q: 2, r: 0, id: TERRAIN.tundra },
      { q: 3, r: 0, id: TERRAIN.tundra },
      { q: 4, r: 0, id: TERRAIN.tundra },
    ];
    const positions = placeOnPaintedMap(7, 7, painted, [], 4, [0]);
    for (const { r } of positions) expect(r).toBe(0);
  });

  it("generateMap reproduces the stage run: same seed, same forked stream", () => {
    // Pins the PRNG fork label the pipeline uses. Rename the fork and the
    // pipeline stays internally deterministic while silently drawing from a
    // different stream than the stage harness.
    const params = makeParams({ mapSize: "standard", numPlayers: 6 });
    expect(generateMap(params).startPositions).toEqual(
      runStartPositions(params).startPositions.startPositions,
    );
  });
});
