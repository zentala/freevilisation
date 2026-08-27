import { neighbors, distance, OWNED_EDGE_DIRECTIONS } from "@freevilisation/engine";
import type { WrapContext } from "@freevilisation/engine";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { LandmassResult } from "./landmass.js";
import { wrapContextFor } from "../config.js";
import { farthestPointSample } from "./start-positions.js";

/**
 * A river runs along a hex EDGE, not on a tile (ADR-026). Each tile owns
 * storage for the three edges in directions 0, 1, 2 (`AXIAL_DIRECTIONS`
 * order); the other three are read from the neighbour that owns them, via
 * `hasRiverEdge`. Three parallel arrays rather than one packed 3-bit value:
 * index-aligned with `elevation`/`isLand` like every other mapgen array, so
 * a consumer never has to unpack a bitmask to read a single flag.
 */
export interface RiversResult {
  /** River flag on the edge this tile owns in direction 0. */
  readonly riverEdgeDir0: boolean[];
  /** River flag on the edge this tile owns in direction 1. */
  readonly riverEdgeDir1: boolean[];
  /** River flag on the edge this tile owns in direction 2. */
  readonly riverEdgeDir2: boolean[];
}

/**
 * Number of river sources: one per 40 land tiles, minimum 1.
 */
function sourceCount(landTileCount: number): number {
  return Math.max(1, Math.floor(landTileCount / 40));
}

/**
 * Upper bound on trace steps: a circuit breaker (Unciv's `maxRiverLength`)
 * that guarantees termination even when a destination is unreachable by
 * land or the walk gets stuck oscillating between two equally-close tiles.
 */
function maxRiverLength(width: number, height: number): number {
  return (width + height) * 2;
}

/** Marks the river flag on the edge owned by `ownerIdx` in `ownedDirection` (0..2). */
function markEdge(rivers: RiversResult, ownerIdx: number, ownedDirection: number): void {
  switch (ownedDirection) {
    case 0:
      rivers.riverEdgeDir0[ownerIdx] = true;
      return;
    case 1:
      rivers.riverEdgeDir1[ownerIdx] = true;
      return;
    case 2:
      rivers.riverEdgeDir2[ownerIdx] = true;
      return;
    default:
      throw new Error(`ownedDirection must be 0..2, got ${ownedDirection}`);
  }
}

/**
 * The top-decile elevation pool, sorted highest first: the candidate set
 * river sources are drawn from (headwaters sit on high ground).
 */
function topElevationDecile(
  landIndices: readonly number[],
  elevation: readonly number[],
): number[] {
  const sorted = landIndices.slice().sort((a, b) => elevation[b]! - elevation[a]!);
  const decileSize = Math.max(1, Math.ceil(sorted.length * 0.1));
  return sorted.slice(0, decileSize);
}

/**
 * Select river sources from the top-decile elevation pool, spread apart by
 * the farthest-point sampler shared with start-position placement
 * (`start-positions.ts`) — one implementation of the spacing algorithm, not
 * a second one reinvented here.
 */
export function selectRiverSources(
  landIndices: readonly number[],
  elevation: readonly number[],
  width: number,
  numSources: number,
  ctx: StageContext,
  wrap: WrapContext,
): number[] {
  const pool = topElevationDecile(landIndices, elevation);
  const candidates = pool.map((idx) => ({ q: idx % width, r: (idx - (idx % width)) / width, idx }));
  const chosen = farthestPointSample(candidates, numSources, ctx, wrap);
  return chosen.map((c) => c.idx);
}

/**
 * BFS outward from `sourceIdx` for the closest non-land tile — the sea
 * outlet a river aims for (mirrors Unciv `RiverGenerator.getClosestWaterTile`).
 * Returns `null` when no water tile is reachable (a fully landlocked region).
 */
function findClosestWaterTile(
  sourceIdx: number,
  width: number,
  height: number,
  isLand: readonly boolean[],
  wrap: WrapContext,
): number | null {
  const visited = new Uint8Array(width * height);
  const queue: number[] = [sourceIdx];
  visited[sourceIdx] = 1;

  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head]!;
    const q = idx % width;
    const r = (idx - q) / width;

    for (const { q: nq, r: nr } of neighbors({ q, r }, wrap)) {
      if (nr < 0 || nr >= height) continue;
      if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) continue;
      const ni = nr * width + nq;
      if (visited[ni]) continue;
      visited[ni] = 1;
      if (!isLand[ni]!) return ni;
      queue.push(ni);
    }
  }

  return null;
}

/**
 * Trace one river from `sourceIdx` toward its sea outlet: at every step,
 * cross to whichever neighbour minimizes distance to the destination
 * (Unciv's closest-water-tile targeting), marking the crossed edge. Stops at
 * the outlet, a dead end (no unvisited neighbour is closer), or `maxSteps`.
 * Returns the final tile index reached, so a caller can confirm the trace
 * ended at the coast rather than stalling inland.
 */
export function traceRiverFromSource(
  sourceIdx: number,
  width: number,
  height: number,
  isLand: readonly boolean[],
  wrap: WrapContext,
  rivers: RiversResult,
  maxSteps: number,
): number {
  const destIdx = findClosestWaterTile(sourceIdx, width, height, isLand, wrap);
  if (destIdx === null) return sourceIdx;
  const destQ = destIdx % width;
  const destR = (destIdx - destQ) / width;

  let current = sourceIdx;
  const visited = new Set<number>([current]);

  for (let step = 0; step < maxSteps; step++) {
    const q = current % width;
    const r = (current - q) / width;
    let bestIdx = -1;
    let bestDirection = -1;
    let bestDistance = Infinity;

    neighbors({ q, r }, wrap).forEach(({ q: nq, r: nr }, direction) => {
      if (nr < 0 || nr >= height) return;
      if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) return;
      const d = distance({ q: nq, r: nr }, { q: destQ, r: destR }, wrap);
      if (d < bestDistance) {
        bestDistance = d;
        bestIdx = nr * width + nq;
        bestDirection = direction;
      }
    });

    if (bestIdx === -1 || visited.has(bestIdx)) break;
    // Reached the outlet: stop without marking the final (into-water) edge.
    if (!isLand[bestIdx]!) break;

    if (bestDirection < OWNED_EDGE_DIRECTIONS) {
      markEdge(rivers, current, bestDirection);
    } else {
      markEdge(rivers, bestIdx, bestDirection - OWNED_EDGE_DIRECTIONS);
    }

    visited.add(bestIdx);
    current = bestIdx;
  }

  return current;
}

/**
 * Generate rivers by tracing from elevation maxima toward a sea outlet.
 *
 * Algorithm:
 * 1. Select land tiles in the top 10% elevation percentile as candidates.
 * 2. Spread a bounded subset across the map via farthest-point sampling.
 * 3. From each source, find its closest water tile and trace toward it,
 *    marking the EDGE crossed on each step (not the destination tile),
 *    stopping at the outlet, a dead end, or the step bound.
 */
export function generateRivers(
  params: MapGenParams,
  landmass: LandmassResult,
  ctx: StageContext,
): RiversResult {
  const { width, height, elevation, isLand } = landmass;
  const wrap = wrapContextFor(width);
  const total = width * height;
  const rivers: RiversResult = {
    riverEdgeDir0: new Array<boolean>(total).fill(false),
    riverEdgeDir1: new Array<boolean>(total).fill(false),
    riverEdgeDir2: new Array<boolean>(total).fill(false),
  };

  ctx.onProgress(0);

  const landIndices: number[] = [];
  for (let i = 0; i < total; i++) {
    if (isLand[i]!) landIndices.push(i);
  }

  if (landIndices.length === 0) {
    ctx.onProgress(100);
    return rivers;
  }

  const numSources = sourceCount(landIndices.length);
  const sourcesPrng = ctx.prng.fork("river-sources");
  const sources = selectRiverSources(
    landIndices,
    elevation,
    width,
    numSources,
    {
      prng: sourcesPrng,
      onProgress: () => {},
    },
    wrap,
  );

  const bound = maxRiverLength(width, height);
  for (const sourceIdx of sources) {
    traceRiverFromSource(sourceIdx, width, height, isLand, wrap, rivers, bound);
  }

  ctx.onProgress(100);
  return rivers;
}
