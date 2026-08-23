import { neighbors, OWNED_EDGE_DIRECTIONS } from "@freevilisation/engine";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { LandmassResult } from "./landmass.js";
import { wrapContextFor } from "../config.js";

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
 * Upper bound on trace steps to guarantee termination.
 * Set to width + height — long enough to cross any reasonable map, short
 * enough to halt on pathological elevation fields.
 */
function stepBound(width: number, height: number): number {
  return width + height;
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
 * Generate rivers by simulating downhill flow from elevation maxima to coast.
 *
 * Algorithm:
 * 1. Select land tiles in the top 10% elevation percentile as candidates.
 * 2. Randomly pick a bounded subset as actual river sources.
 * 3. From each source, trace downhill to the lowest unvisited hex neighbor,
 *    marking the EDGE crossed on each step (not the destination tile),
 *    stopping at coast, local minimum, or step bound.
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

  // Collect land tile indices and their elevations
  const landIndices: number[] = [];
  for (let i = 0; i < total; i++) {
    if (isLand[i]!) landIndices.push(i);
  }

  if (landIndices.length === 0) {
    ctx.onProgress(100);
    return rivers;
  }

  // Sort by elevation descending to find the top 10% percentile
  landIndices.sort((a, b) => elevation[b]! - elevation[a]!);
  const topTenPercent = Math.max(1, Math.ceil(landIndices.length * 0.1));
  const candidates = landIndices.slice(0, topTenPercent);

  // Pick bounded number of sources from candidates using the PRNG
  const numSources = sourceCount(landIndices.length);
  const sourcesPrng = ctx.prng.fork("river-sources");
  const sources: number[] = [];
  const used = new Set<number>();
  for (let i = 0; i < numSources && i < candidates.length; i++) {
    // Pick a random index from remaining candidates
    const pick = Math.floor(sourcesPrng.next() * (candidates.length - i));
    const candidateIdx = candidates[pick]!;
    if (!used.has(candidateIdx)) {
      sources.push(candidateIdx);
      used.add(candidateIdx);
    }
    // Swap picked candidate to end and shrink window
    const lastIdx = candidates.length - 1 - i;
    candidates[pick] = candidates[lastIdx]!;
  }

  const bound = stepBound(width, height);

  // Trace each source downhill
  for (const sourceIdx of sources) {
    let current = sourceIdx;
    const visited = new Set<number>();
    visited.add(current);

    for (let step = 0; step < bound; step++) {
      const q = current % width;
      const r = (current - q) / width;
      const currentElev = elevation[current]!;

      // Find lowest unvisited neighbor
      let lowestIdx = -1;
      let lowestElev = Infinity;
      let lowestDirection = -1;

      neighbors({ q, r }, wrap).forEach(({ q: nq, r: nr }, direction) => {
        if (nr < 0 || nr >= height) return;
        if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) return;
        const ni = nr * width + nq;
        if (visited.has(ni)) return;
        if (elevation[ni]! < lowestElev) {
          lowestElev = elevation[ni]!;
          lowestIdx = ni;
          lowestDirection = direction;
        }
      });

      // No lower neighbor → local minimum, stop
      if (lowestIdx === -1 || lowestElev >= currentElev) break;

      // Mark the edge crossed (only onto land tiles)
      if (!isLand[lowestIdx]!) break;

      if (lowestDirection < OWNED_EDGE_DIRECTIONS) {
        markEdge(rivers, current, lowestDirection);
      } else {
        markEdge(rivers, lowestIdx, lowestDirection - OWNED_EDGE_DIRECTIONS);
      }

      visited.add(lowestIdx);
      current = lowestIdx;
    }
  }

  return rivers;
}
