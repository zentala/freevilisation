import { describe, it, expect } from "vitest";
import { neighbors } from "@freevilisation/engine";
import { generateStartPositions } from "./start-positions.js";
import { TERRAIN } from "./climate.js";
import {
  runStartPositions,
  makeParams,
  minPairwiseHexDistance,
  wrapContextFor,
  scriptedPrng,
  placeOnHandMadeMap,
  placeOnPaintedMap,
} from "./start-positions.test-fixtures.js";

describe("generateStartPositions — hex geometry (neighbours and distance)", () => {
  it("an interior hex has exactly six neighbours, including the two a 4-offset grid omits", () => {
    // The old NEIGHBOR_OFFSETS table ([up, down, left, right]) is exactly four
    // of the six axial directions — it omits (1,-1) and (-1,1). This test fails
    // against that table (4 entries, missing the two diagonals) and passes
    // against the engine's real hex neighbours.
    const wrap = wrapContextFor("archipelago", 100);
    const result = neighbors({ q: 10, r: 10 }, wrap);
    expect(result).toHaveLength(6);
    const offsets = result.map(({ q, r }) => [q - 10, r - 10].join(","));
    expect(new Set(offsets)).toEqual(new Set(["1,0", "-1,0", "0,1", "0,-1", "1,-1", "-1,1"]));
  });

  it("minimum pairwise hex distance has a floor", () => {
    const params = makeParams({ mapSize: "standard", numPlayers: 4 });
    const { landmass, startPositions } = runStartPositions(params);
    const wrap = wrapContextFor(params.mapType, landmass.width);
    const d = minPairwiseHexDistance(startPositions.startPositions, wrap);
    expect(d).toBeGreaterThanOrEqual(2);
  });

  it("ranks candidates by hex distance, not Chebyshev", () => {
    // From (0,0): (4,0) is Chebyshev 4 / hex 4; (3,3) is Chebyshev 3 / hex 6
    // (same-sign axial offsets add up under the hex metric instead of capping
    // at the larger axis). A Chebyshev-based sampler picks (4,0) as farthest;
    // the correct hex-based one picks (3,3).
    const width = 5;
    const height = 4;
    const size = width * height;
    const isLand = new Array(size).fill(false);
    for (const { q, r } of [
      { q: 0, r: 0 },
      { q: 4, r: 0 },
      { q: 3, r: 3 },
    ]) {
      isLand[r * width + q] = true;
    }

    const { startPositions } = generateStartPositions(
      { seed: 1, mapType: "archipelago", mapSize: "tiny", numPlayers: 2 },
      { width, height, elevation: new Array(size).fill(1), isLand },
      { terrainDefId: new Array(size).fill(TERRAIN.desert) } as never,
      { resourceDefId: new Array(size).fill(null) } as never,
      { prng: scriptedPrng([0]), onProgress: () => {} },
    );

    expect(startPositions).toEqual([
      { q: 0, r: 0 },
      { q: 3, r: 3 },
    ]);
  });

  it("counts a hex-diagonal neighbour a 4-direction (up/down/left/right) grid would miss", () => {
    // Only two tiles are land: a decoy at (0,0) and a target at (1,1). A
    // resource sits at (2,0) — not land, just a marker — which is a real hex
    // neighbour of (1,1) via axial direction (1,-1), one of the two the old
    // 4-offset table omitted. It is NOT a neighbour of (0,0) under either
    // table. With the diagonal counted, (1,1) is the sole quality>=1
    // candidate and wins the only slot; miss it, and every candidate scores
    // 0, so the fallback (scan-order-first) picks the decoy at (0,0) instead.
    const width = 3;
    const height = 3;
    const size = width * height;
    const isLand = new Array(size).fill(false);
    isLand[0 * width + 0] = true;
    isLand[1 * width + 1] = true;
    const terrainDefId = new Array(size).fill(TERRAIN.desert);
    const resourceDefId = new Array(size).fill(null);
    resourceDefId[0 * width + 2] = "resource_probe";

    const { startPositions } = generateStartPositions(
      { seed: 1, mapType: "archipelago", mapSize: "tiny", numPlayers: 1 },
      { width, height, elevation: new Array(size).fill(1), isLand },
      { terrainDefId } as never,
      { resourceDefId } as never,
      { prng: scriptedPrng([0]), onProgress: () => {} },
    );

    expect(startPositions).toEqual([{ q: 1, r: 1 }]);
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
      { seed: 1, mapType: "archipelago", mapSize: "tiny", numPlayers: 2 },
      {
        width,
        height: 1,
        elevation: new Array(width).fill(1),
        isLand: new Array(width).fill(true),
      },
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
    // (0,2) to quality 1, and those two are exactly the pool for two players.
    const positions = placeOnPaintedMap(1, 5, [], [{ q: 0, r: 1 }], 2, [0]);
    expect(positions).toEqual([
      { q: 0, r: 0 },
      { q: 0, r: 2 },
    ]);
  });

  it("counts the tile directly to the right as a neighbour, not the one below it", () => {
    // A one-row strip, so the vertical offsets are always out of bounds. The
    // resource at q=2 lifts q=1 to quality 1, the only tile clearing the floor,
    // so it takes the single slot.
    const positions = placeOnPaintedMap(3, 1, [], [{ q: 2, r: 0 }], 1, [0]);
    expect(positions).toEqual([{ q: 1, r: 0 }]);
  });
});
