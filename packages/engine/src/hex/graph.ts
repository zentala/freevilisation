import type { GameMap } from "../game-state.js";
import type { Tile } from "../entities/Tile.js";
import type { AxialCoord } from "./coords.js";
import { neighbors } from "./hex-math.js";
import { getTile, toWrapContext } from "./game-map.js";

/** Predicate that determines whether a tile is passable. */
export type IsPassable = (tile: Tile) => boolean;

/** Cost function between two adjacent axial coordinates. */
export type CostFn = (a: AxialCoord, b: AxialCoord) => number;

/**
 * Returns the passable neighbours of `coord` on `map`, in
 * {@link neighbors} order (which is {@link AXIAL_DIRECTIONS} order).
 *
 * A candidate neighbour is kept only if both:
 * (a) `getTile(map, candidate)` is not `undefined`, and
 * (b) `isPassable(tile)` returns `true` for that tile.
 *
 * Coordinates off the map edges (including north/south hard edges on an
 * otherwise wraparound map) are simply absent from the result — this
 * function never throws for out-of-range coordinates.
 */
export function neighborsOf(coord: AxialCoord, map: GameMap, isPassable: IsPassable): AxialCoord[] {
  const wrap = toWrapContext(map);
  const candidates = neighbors(coord, wrap);
  const result: AxialCoord[] = [];
  for (const c of candidates) {
    const tile = getTile(map, c);
    if (tile !== undefined && isPassable(tile)) {
      result.push(c);
    }
  }
  return result;
}

/**
 * Named pass-through to `costFn(a, b)`.
 *
 * Exists so every caller goes through one typed signature instead of
 * calling arbitrary cost functions directly. Does not validate that `a`
 * and `b` are neighbours — that is the caller's responsibility.
 */
export function edgeCost(a: AxialCoord, b: AxialCoord, costFn: CostFn): number {
  return costFn(a, b);
}
