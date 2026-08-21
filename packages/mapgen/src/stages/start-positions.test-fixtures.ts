import { createPrng, neighbors, distance, type WrapContext } from "@freevilisation/engine";
import { generateStartPositions, placeStartPositions } from "./start-positions.js";
import { generateLandmass } from "./landmass.js";
import { generateClimate, TERRAIN } from "./climate.js";
import { generateResources } from "./resources.js";
import { wrapContextFor } from "../config.js";
import type { MapGenParams } from "../pipeline.js";
import type { TerrainDefId } from "@freevilisation/engine";

export function makeParams(overrides?: Partial<MapGenParams>): MapGenParams {
  return {
    seed: 12345,
    mapType: "continents",
    mapSize: "tiny",
    ...overrides,
  };
}

export function runStartPositions(params: MapGenParams) {
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

/** Hex distance between two positions — the sampler's real spacing metric. */
export function minPairwiseHexDistance(
  positions: { q: number; r: number }[],
  wrap: WrapContext,
): number {
  let min = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const d = distance(positions[i]!, positions[j]!, wrap);
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
export const EXPECTED_QUALITY: Record<string, number> = {
  [TERRAIN.grassland]: 3,
  [TERRAIN.plains]: 2,
  [TERRAIN.tundra]: 1,
  [TERRAIN.desert]: 0,
  [TERRAIN.snow]: 0,
};

/** Oracle for one tile's score: base terrain quality + 1 per adjacent resource. */
export function expectedScore(
  q: number,
  r: number,
  landmass: { width: number; height: number },
  climate: { terrainDefId: readonly (string | null)[] },
  resources: { resourceDefId: readonly (string | null)[] },
  wrap: WrapContext,
): number {
  const { width, height } = landmass;
  let score = EXPECTED_QUALITY[climate.terrainDefId[r * width + q]!] ?? 0;
  for (const { q: nq, r: nr } of neighbors({ q, r }, wrap)) {
    if (nr < 0 || nr >= height) continue;
    if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) continue;
    if (resources.resourceDefId[nr * width + nq] !== null) score += 1;
  }
  return score;
}

/**
 * A hand-built map: every tile is land, every tile is desert, no resources.
 * Every tile therefore scores exactly 0, so the candidate pool can only be
 * "all of them" and farthest-point sampling must span the full height.
 */
export function uniformMap(width: number, height: number) {
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
export function scriptedPrng(values: readonly number[]): ReturnType<typeof createPrng> {
  let i = 0;
  return {
    next: () => values[Math.min(i++, values.length - 1)]!,
  } as unknown as ReturnType<typeof createPrng>;
}

/**
 * A flat (non-wrapping) `WrapContext` of the given width. Every real `MapType`
 * wraps in v1 (see `MAP_TYPE_PRESETS`), so a test wanting a flat grid to
 * isolate the sampling ALGORITHM from the wraparound feature builds this
 * literal directly instead of picking a map type and hoping its preset is
 * flat — wraparound gets its own dedicated tests.
 */
export function flatWrap(width: number): WrapContext {
  return { isWraparoundX: false, width };
}

/**
 * Place `numPlayers` on a map built by hand: `land` lists the only land tiles,
 * every one of them carrying `terrain`, with no resources anywhere.
 */
export function placeOnHandMadeMap(
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
  return placeStartPositions(
    { width, height, elevation: new Array(size).fill(1), isLand },
    { terrainDefId: new Array(size).fill(terrain) },
    { resourceDefId: new Array(size).fill(null) },
    { prng: scriptedPrng(draws), onProgress: () => {} },
    flatWrap(width),
    numPlayers,
  ).startPositions;
}

/**
 * Every tile is land and desert, except the tiles named in `terrain`. Resource
 * tiles are named separately, since a resource lifts its *neighbours* score,
 * not its own.
 */
export function placeOnPaintedMap(
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
  return placeStartPositions(
    { width, height, elevation: new Array(size).fill(1), isLand: new Array(size).fill(true) },
    { terrainDefId },
    { resourceDefId },
    { prng: scriptedPrng(draws), onProgress: () => {} },
    flatWrap(width),
    numPlayers,
  ).startPositions;
}

/** Sort helper so a set of positions can be compared regardless of pick order. */
export function byPosition(a: { q: number; r: number }, b: { q: number; r: number }): number {
  return a.r - b.r || a.q - b.q;
}

export { wrapContextFor };
