import { neighbors, distance, type TerrainDefId, type WrapContext } from "@freevilisation/engine";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { LandmassResult } from "./landmass.js";
import type { ClimateResult } from "./climate.js";
import type { ResourcesResult } from "./resources.js";
import { TERRAIN } from "./climate.js";
import { wrapContextFor } from "../config.js";
import { normalizeStartPositions } from "./start-positions-normalize.js";

/** Default player count when `MapGenParams.numPlayers` is omitted. */
const DEFAULT_NUM_PLAYERS = 4;

/** Initial quality floor a candidate tile's score must clear (see step 3). */
const INITIAL_QUALITY_FLOOR = 3;

/** How many times the quality floor is lowered before falling back to all land tiles. */
const MAX_FLOOR_RELAXATIONS = 5;

/**
 * Base terrain quality, standing in for real yields (no `TerrainDef.baseYields`
 * fixture exists yet — see task notes). Ocean/coast are intentionally absent:
 * they are never candidate tiles (step 1 filters to land only).
 */
export const TERRAIN_QUALITY: Partial<Record<TerrainDefId, number>> = {
  [TERRAIN.grassland]: 3,
  [TERRAIN.plains]: 2,
  [TERRAIN.tundra]: 1,
  [TERRAIN.desert]: 0,
  [TERRAIN.snow]: 0,
};

export interface StartPosition {
  readonly q: number;
  readonly r: number;
}

export interface StartPositionsResult {
  readonly startPositions: StartPosition[];
}

interface Candidate {
  readonly q: number;
  readonly r: number;
  readonly quality: number;
}

/**
 * Quality score for one land tile: its own base terrain quality, plus +1 for
 * each in-bounds hex neighbor that carries a resource. This is a simple
 * "adjacent yield sum" proxy, not a real yield calculation.
 */
function scoreTile(
  q: number,
  r: number,
  width: number,
  height: number,
  climate: ClimateResult,
  resources: ResourcesResult,
  wrap: WrapContext,
): number {
  const idx = r * width + q;
  let score = TERRAIN_QUALITY[climate.terrainDefId[idx]!] ?? 0;

  for (const { q: nq, r: nr } of neighbors({ q, r }, wrap)) {
    if (nr < 0 || nr >= height) continue;
    if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) continue;
    if (resources.resourceDefId[nr * width + nq] !== null) score += 1;
  }

  return score;
}

function buildCandidates(
  landmass: LandmassResult,
  climate: ClimateResult,
  resources: ResourcesResult,
  wrap: WrapContext,
): Candidate[] {
  const { width, height } = landmass;
  const candidates: Candidate[] = [];

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = r * width + q;
      if (!landmass.isLand[idx]) continue;
      if (!(climate.terrainDefId[idx]! in TERRAIN_QUALITY)) continue;
      candidates.push({
        q,
        r,
        quality: scoreTile(q, r, width, height, climate, resources, wrap),
      });
    }
  }

  return candidates;
}

function buildAllLandCandidates(landmass: LandmassResult): Candidate[] {
  const { width, height } = landmass;
  const candidates: Candidate[] = [];
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = r * width + q;
      if (landmass.isLand[idx]) candidates.push({ q, r, quality: 0 });
    }
  }
  return candidates;
}

/**
 * Apply the relaxing quality floor (step 3): filter to `quality >= floor`,
 * lowering the floor on shortage, falling back to all land tiles if even a
 * floor of 0 leaves too few candidates.
 */
function selectCandidatePool(
  allCandidates: Candidate[],
  landmass: LandmassResult,
  numPlayers: number,
): Candidate[] {
  let floor = INITIAL_QUALITY_FLOOR;
  for (let attempt = 0; attempt <= MAX_FLOOR_RELAXATIONS; attempt++) {
    const filtered = allCandidates.filter((c) => c.quality >= floor);
    if (filtered.length >= numPlayers) return filtered;
    floor -= 1;
  }
  const allLand = buildAllLandCandidates(landmass);
  if (allLand.length < numPlayers) {
    throw new Error(
      `Cannot place ${numPlayers} players on a map with ${allLand.length} land tiles; ` +
        `place fewer players or use a larger map.`,
    );
  }
  return allLand;
}

/** Pick uniformly at random among indices tied for the given value. */
function pickTiedIndex(values: readonly number[], best: number, prng: { next(): number }): number {
  const tied: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] === best) tied.push(i);
  }
  return tied[Math.floor(prng.next() * tied.length)]!;
}

/**
 * Greedy farthest-point sampling: first pick is uniform random, every
 * subsequent pick maximizes the minimum distance to all chosen positions,
 * ties broken by PRNG draw (never array order, to avoid a north-west bias).
 *
 * Generic over any `{ q, r }`-bearing item so other stages (river sources,
 * see `rivers.ts`) can reuse the same spacing algorithm instead of writing a
 * second one — this is the only implementation of it in the codebase.
 */
export function farthestPointSample<T extends { readonly q: number; readonly r: number }>(
  pool: readonly T[],
  count: number,
  ctx: StageContext,
  wrap: WrapContext,
): T[] {
  const remaining = pool.slice();
  const chosen: T[] = [];

  ctx.onProgress(0);

  if (remaining.length === 0) return chosen;
  const firstIdx = Math.floor(ctx.prng.next() * remaining.length);
  chosen.push(remaining.splice(firstIdx, 1)[0]!);

  while (chosen.length < count && remaining.length > 0) {
    const minDistances = remaining.map((candidate) =>
      Math.min(...chosen.map((c) => distance(candidate, c, wrap))),
    );
    const best = Math.max(...minDistances);
    const pickIdx = pickTiedIndex(minDistances, best, ctx.prng);
    chosen.push(remaining.splice(pickIdx, 1)[0]!);
  }

  return chosen;
}

export function generateStartPositions(
  params: MapGenParams,
  landmass: LandmassResult,
  climate: ClimateResult,
  resources: ResourcesResult,
  ctx: StageContext,
): StartPositionsResult {
  const numPlayers = params.numPlayers ?? DEFAULT_NUM_PLAYERS;
  const wrap = wrapContextFor(landmass.width);
  return placeStartPositions(landmass, climate, resources, ctx, wrap, numPlayers);
}

/**
 * The placement algorithm itself, wrap-agnostic: `generateStartPositions`
 * resolves `wrap` from `params.mapType` and delegates here. Exported
 * separately so tests can exercise candidate scoring and farthest-point
 * sampling against an explicit `WrapContext` (e.g. a flat grid via
 * `flatWrap()`) without needing a map type whose preset happens to be flat —
 * every `MapType` wraps in v1 (see `MAP_TYPE_PRESETS`).
 */
export function placeStartPositions(
  landmass: LandmassResult,
  climate: ClimateResult,
  resources: ResourcesResult,
  ctx: StageContext,
  wrap: WrapContext,
  numPlayers: number = DEFAULT_NUM_PLAYERS,
): StartPositionsResult {
  const allCandidates = buildCandidates(landmass, climate, resources, wrap);
  const pool = selectCandidatePool(allCandidates, landmass, numPlayers);
  const startPositions = farthestPointSample(pool, numPlayers, ctx, wrap).map(({ q, r }) => ({
    q,
    r,
  }));
  normalizeStartPositions(
    startPositions,
    landmass,
    climate,
    resources,
    wrap,
    ctx.prng.fork("normalize"),
  );
  return { startPositions };
}
