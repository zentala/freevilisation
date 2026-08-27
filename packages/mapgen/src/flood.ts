import { neighbors, type WrapContext } from "@freevilisation/engine";

/**
 * The grid shape every flood/distance pass needs: dimensions plus the
 * wraparound context that decides whether q wraps at the east-west seam.
 * Not a `GameMap` — generation runs before one exists (ADR-021 aside);
 * every mapgen stage builds this from `wrapContextFor` in `config.ts`.
 */
export interface FloodGrid {
  readonly width: number;
  readonly height: number;
  readonly wrap: WrapContext;
}

/** Connected-component id per tile index, `-1` for tiles the predicate rejects. */
export interface FloodResult {
  /** Component id per tile index, `-1` for tiles outside the predicate. */
  readonly componentId: number[];
  /** Tile count per component id, index-aligned with the id. */
  readonly componentSize: number[];
  /**
   * Tile indices per component id, in the order they were visited. The
   * first index of each component is always its lowest-scanned seed
   * (row-major `(r, q)` order), so sorting components by their first
   * index gives the deterministic `(r, q)`-seed order the epic calls for.
   */
  readonly componentTiles: number[][];
}

/**
 * Flood-fills every tile for which `predicate` is true into connected
 * components, using the engine's hex neighbours and wraparound rules.
 *
 * Shared traversal core for every connected-component pass over the tile
 * grid: E04-W4-T01's land flood fill, E55-W1-T01's water/lake flood fill,
 * and any future pass — one wraparound-aware walk instead of three private
 * copies of it, each a fresh chance to get the cylinder seam wrong.
 *
 * Scans tiles in row-major `(r, q)` order, so component ids and the order
 * within `componentTiles` are deterministic for a given grid and predicate.
 */
export function floodComponents(grid: FloodGrid, predicate: (idx: number) => boolean): FloodResult {
  const { width, height, wrap } = grid;
  const total = width * height;
  const componentId = new Array<number>(total).fill(-1);
  const componentSize: number[] = [];
  const componentTiles: number[][] = [];

  for (let start = 0; start < total; start++) {
    if (!predicate(start) || componentId[start] !== -1) continue;
    const id = componentSize.length;
    const tiles: number[] = [];
    const stack = [start];
    componentId[start] = id;
    while (stack.length > 0) {
      const cur = stack.pop()!;
      tiles.push(cur);
      const r = Math.floor(cur / width);
      const q = cur % width;
      for (const n of neighbors({ q, r }, wrap)) {
        if (n.r < 0 || n.r >= height) continue;
        if (!wrap.isWraparoundX && (n.q < 0 || n.q >= width)) continue;
        const ni = n.r * width + n.q;
        if (predicate(ni) && componentId[ni] === -1) {
          componentId[ni] = id;
          stack.push(ni);
        }
      }
    }
    componentSize.push(tiles.length);
    componentTiles.push(tiles);
  }

  return { componentId, componentSize, componentTiles };
}

/**
 * Multi-source BFS: the hex-step distance from every tile to its nearest
 * `seed` tile, wraparound-aware and computed in one pass over the whole
 * grid rather than one search per seed.
 *
 * Unreached tiles (no seed, or an unreachable grid) keep `Infinity`.
 */
export function multiSourceDistance(grid: FloodGrid, seeds: readonly number[]): number[] {
  const { width, height, wrap } = grid;
  const total = width * height;
  const dist = new Array<number>(total).fill(Infinity);

  let frontier: number[] = [];
  for (const seed of seeds) {
    if (dist[seed] === 0) continue;
    dist[seed] = 0;
    frontier.push(seed);
  }

  let step = 1;
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const cur of frontier) {
      const r = Math.floor(cur / width);
      const q = cur % width;
      for (const n of neighbors({ q, r }, wrap)) {
        if (n.r < 0 || n.r >= height) continue;
        if (!wrap.isWraparoundX && (n.q < 0 || n.q >= width)) continue;
        const ni = n.r * width + n.q;
        if (dist[ni]! > step) {
          dist[ni] = step;
          next.push(ni);
        }
      }
    }
    frontier = next;
    step++;
  }

  return dist;
}
