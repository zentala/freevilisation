import { neighbors } from "@freevilisation/engine";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { LandmassResult } from "./landmass.js";
import { wrapContextFor } from "../config.js";

export interface RiversResult {
  /** Per-tile river flag, length = width * height, index-aligned with elevation. */
  readonly hasRiver: boolean[];
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

/**
 * Generate rivers by simulating downhill flow from elevation maxima to coast.
 *
 * Algorithm:
 * 1. Select land tiles in the top 10% elevation percentile as candidates.
 * 2. Randomly pick a bounded subset as actual river sources.
 * 3. From each source, trace downhill to the lowest unvisited hex neighbor,
 *    marking `hasRiver = true` along the path, stopping at coast, local
 *    minimum, or step bound.
 */
export function generateRivers(
  params: MapGenParams,
  landmass: LandmassResult,
  ctx: StageContext,
): RiversResult {
  const { width, height, elevation, isLand } = landmass;
  const wrap = wrapContextFor(width);
  const total = width * height;
  const hasRiver = new Array<boolean>(total).fill(false);

  ctx.onProgress(0);

  // Collect land tile indices and their elevations
  const landIndices: number[] = [];
  for (let i = 0; i < total; i++) {
    if (isLand[i]!) landIndices.push(i);
  }

  if (landIndices.length === 0) {
    ctx.onProgress(100);
    return { hasRiver };
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

      for (const { q: nq, r: nr } of neighbors({ q, r }, wrap)) {
        if (nr < 0 || nr >= height) continue;
        if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) continue;
        const ni = nr * width + nq;
        if (visited.has(ni)) continue;
        if (elevation[ni]! < lowestElev) {
          lowestElev = elevation[ni]!;
          lowestIdx = ni;
        }
      }

      // No lower neighbor → local minimum, stop
      if (lowestIdx === -1 || lowestElev >= currentElev) break;

      // Mark the neighbor as river (only land tiles)
      if (!isLand[lowestIdx]!) break;

      hasRiver[lowestIdx] = true;
      visited.add(lowestIdx);
      current = lowestIdx;
    }
  }

  return { hasRiver };
}
