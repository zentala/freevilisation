import type { GameMap } from "../game-state.js";
import type { Tile } from "../entities/Tile.js";
import type { AxialCoord } from "./coords.js";
import { toHexKey } from "./coords.js";
import type { WrapContext } from "./hex-math.js";

/** Factory function that creates a Tile for a given axial coordinate. */
export type TileFactory = (coord: AxialCoord) => Tile;

/**
 * Builds a rectangular {@link GameMap} from width/height/wrap parameters
 * and a tile factory.
 *
 * The grid covers `q ∈ [0, width)` × `r ∈ [0, height)` in axial space.
 * `tileFactory` is called exactly once per coordinate in row-major order
 * (r ascending outer, q ascending inner). The returned `tiles` record has
 * exactly `width * height` keys.
 *
 * @throws {Error} If `width` or `height` is ≤ 0.
 */
export function buildGameMap(
  width: number,
  height: number,
  isWraparoundX: boolean,
  tileFactory: TileFactory,
): GameMap {
  if (width <= 0) {
    throw new Error(`buildGameMap width must be positive, got ${width}`);
  }
  if (height <= 0) {
    throw new Error(`buildGameMap height must be positive, got ${height}`);
  }

  const tiles: Record<string, Tile> = {};

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const coord: AxialCoord = { q, r };
      const tile = tileFactory(coord);
      tiles[toHexKey(coord)] = tile;
    }
  }

  return { width, height, isWraparoundX, tiles: tiles as GameMap["tiles"] };
}

/**
 * Returns the tile at `coord`, or `undefined` if the coordinate has no entry.
 *
 * Coordinates outside `[0, width) × [0, height)` are simply absent — this
 * function never throws for out-of-range coordinates.
 */
export function getTile(map: GameMap, coord: AxialCoord): Tile | undefined {
  return map.tiles[toHexKey(coord)];
}

/**
 * Returns `true` if `map.tiles` contains an entry for `coord`.
 *
 * Equivalent to `getTile(map, coord) !== undefined` but does not require
 * callers to import `getTile` just to null-check.
 */
export function hasTile(map: GameMap, coord: AxialCoord): boolean {
  return toHexKey(coord) in map.tiles;
}

/**
 * Projects a {@link GameMap}'s own fields into the {@link WrapContext} shape
 * that `hex-math.ts` functions expect.
 *
 * This is the canonical way to build a `WrapContext` from a `GameMap` —
 * callers should never hand-roll that object themselves.
 */
export function toWrapContext(map: GameMap): WrapContext {
  return { isWraparoundX: map.isWraparoundX, width: map.width };
}
