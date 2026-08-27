import { describe, it, expect, vi } from "vitest";
import type { TerrainDefId } from "@freevilisation/engine";
import { validateMap, generateWithValidation, MAX_REROLL_ATTEMPTS } from "./validation.js";
import { TERRAIN } from "./climate.js";
import type { MapGenParams, MapGenResult, MapType } from "../pipeline.js";

const OCEAN: TerrainDefId = TERRAIN.ocean;
const GRASSLAND: TerrainDefId = TERRAIN.grassland;

function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return { seed: 1, mapType: "continents", mapSize: "tiny", ...overrides };
}

/** Builds a minimal `MapGenResult` fixture; `landTiles` marks land by tile index. */
function makeResult(
  width: number,
  height: number,
  landTiles: ReadonlySet<number>,
  overrides?: Partial<MapGenResult>,
): MapGenResult {
  const total = width * height;
  const isLand = Array.from({ length: total }, (_, i) => landTiles.has(i));
  const terrainDefId = isLand.map((land) => (land ? GRASSLAND : OCEAN));
  return {
    seed: 1,
    mapType: "continents",
    mapSize: "tiny",
    width,
    height,
    isWraparoundX: false,
    elevation: new Array<number>(total).fill(0.5),
    isLand,
    terrainDefId,
    distanceToLand: isLand.map((land) => (land ? 0 : 1)),
    riverEdgeDir0: new Array<boolean>(total).fill(false),
    riverEdgeDir1: new Array<boolean>(total).fill(false),
    riverEdgeDir2: new Array<boolean>(total).fill(false),
    featureDefId: new Array<null>(total).fill(null),
    resourceDefId: new Array<null>(total).fill(null),
    startPositions: [],
    ...overrides,
  };
}

/** Every tile index in the rectangle `[q0,q1) x [r0,r1)` of a `width`-wide grid. */
function rect(width: number, q0: number, q1: number, r0: number, r1: number): number[] {
  const indices: number[] = [];
  for (let r = r0; r < r1; r++) {
    for (let q = q0; q < q1; q++) indices.push(r * width + q);
  }
  return indices;
}

describe("validateMap", () => {
  it("removes a single-tile island below MIN_ISLAND_SIZE, not a reroll", () => {
    const width = 10;
    const height = 10;
    // A 40-tile mainland (rows 0-3) plus a lone tile far away (row 8): 41/100
    // = 0.41 before repair, 40/100 = 0.40 after — both inside continents'
    // 0.42 ± 0.1 tolerance.
    const mainland = rect(width, 0, 10, 0, 4);
    const island = [8 * width + 5];
    const landTiles = new Set([...mainland, ...island]);
    const result = makeResult(width, height, landTiles, {
      startPositions: [{ q: 5, r: 1 }],
    });

    const outcome = validateMap(result);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const islandIndex = island[0]!;
    expect(outcome.result.isLand[islandIndex]).toBe(false);
    expect(outcome.result.terrainDefId[islandIndex]).toBe(OCEAN);
    for (const i of mainland) expect(outcome.result.isLand[i]).toBe(true);
  });

  it("does not invoke reroll when the only issue is a repairable tiny island", () => {
    const width = 10;
    const height = 10;
    const mainland = rect(width, 0, 10, 0, 4);
    const island = [8 * width + 5];
    const landTiles = new Set([...mainland, ...island]);
    const fixture = makeResult(width, height, landTiles, {
      startPositions: [{ q: 5, r: 1 }],
    });
    const generate = vi.fn(() => fixture);

    const result = generateWithValidation(makeParams(), generate);

    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.isLand[island[0]!]).toBe(false);
  });

  it("rejects a stranded start and generateWithValidation rerolls with a forked seed until bound exceeded", () => {
    // A single-tile "island" that always gets repaired away, stranding the
    // start placed on it — a failure validateMap cannot fix locally.
    const width = 5;
    const height = 5;
    const landTiles = new Set([2 * width + 2]);
    const fixture = makeResult(width, height, landTiles, {
      startPositions: [{ q: 2, r: 2 }],
    });

    const soleOutcome = validateMap(fixture);
    expect(soleOutcome.ok).toBe(false);

    const seedsSeen: number[] = [];
    const generate = vi.fn((params: MapGenParams) => {
      seedsSeen.push(params.seed);
      return fixture;
    });

    expect(() => generateWithValidation(makeParams({ seed: 7 }), generate)).toThrow(
      `after ${MAX_REROLL_ATTEMPTS} reroll attempts`,
    );

    expect(generate).toHaveBeenCalledTimes(MAX_REROLL_ATTEMPTS + 1);
    expect(new Set(seedsSeen).size).toBe(seedsSeen.length);
    expect(seedsSeen[0]).toBe(7);
  });

  it("rejects a land fraction outside the map type's tolerance", () => {
    const width = 10;
    const height = 10;
    // All water: 0.0 land fraction, outside continents' 0.42 +/- 0.1 band.
    const result = makeResult(width, height, new Set());

    const outcome = validateMap(result);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toContain("land fraction");
  });

  it("rejects a pangaea map that rolled multiple large landmasses", () => {
    const width = 10;
    const height = 10;
    // Two components separated by a full water row (rows 3 and 6-9): 30 + 20
    // = 50 land tiles (0.50, within pangaea's 0.55 ± 0.1), largest holds
    // 30/50 = 60% < the 85% one-continent bar.
    const blockA = rect(width, 0, 10, 0, 3);
    const blockB = rect(width, 0, 10, 4, 6);
    const landTiles = new Set([...blockA, ...blockB]);
    const result = makeResult(width, height, landTiles, {
      mapType: "pangaea" as MapType,
      startPositions: [{ q: 5, r: 1 }],
    });

    const outcome = validateMap(result);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toContain("pangaea");
  });
});
