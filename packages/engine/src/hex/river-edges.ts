import type { GameMap } from "../game-state.js";
import type { Tile } from "../entities/Tile.js";
import type { AxialCoord } from "./coords.js";
import { AXIAL_DIRECTIONS, OWNED_EDGE_DIRECTIONS, wrapQ } from "./hex-math.js";
import { getTile, toWrapContext } from "./game-map.js";

const DIRECTION_COUNT = AXIAL_DIRECTIONS.length;

/** Reads the flag a tile stores for one of ITS OWNED directions (0..2). */
function ownedRiverFlag(tile: Tile, ownedDirection: number): boolean {
  switch (ownedDirection) {
    case 0:
      return tile.riverEdge0;
    case 1:
      return tile.riverEdge1;
    case 2:
      return tile.riverEdge2;
    default:
      throw new Error(
        `ownedDirection must be 0..${OWNED_EDGE_DIRECTIONS - 1}, got ${ownedDirection}`,
      );
  }
}

/**
 * Does the hex edge between `coord` and its neighbour in `direction` carry
 * a river?
 *
 * A tile owns storage for the edges in directions 0, 1 and 2; the edge in
 * direction `d >= OWNED_EDGE_DIRECTIONS` is owned by the neighbour in that
 * direction, at that neighbour's own index `d - OWNED_EDGE_DIRECTIONS`
 * (directions `d` and `(d + 3) % 6` are opposites — see DATA-MODEL.md
 * "River edges" and ADR-026). This function resolves ownership either way
 * and honours east-west wraparound, so callers never need to know which
 * side stores the flag.
 *
 * Returns `false` when the owning tile is off the map — e.g. the map's
 * north/south hard edge, or a coordinate outside the grid.
 */
export function hasRiverEdge(map: GameMap, coord: AxialCoord, direction: number): boolean {
  if (!Number.isInteger(direction) || direction < 0 || direction >= DIRECTION_COUNT) {
    throw new Error(`direction must be an integer 0..${DIRECTION_COUNT - 1}, got ${direction}`);
  }

  if (direction < OWNED_EDGE_DIRECTIONS) {
    const tile = getTile(map, coord);
    return tile ? ownedRiverFlag(tile, direction) : false;
  }

  const wrap = toWrapContext(map);
  const d = AXIAL_DIRECTIONS[direction]!;
  const raw: AxialCoord = { q: coord.q + d.q, r: coord.r + d.r };
  const neighborCoord: AxialCoord = wrap.isWraparoundX
    ? { q: wrapQ(raw.q, wrap.width), r: raw.r }
    : raw;

  const owner = getTile(map, neighborCoord);
  return owner ? ownedRiverFlag(owner, direction - OWNED_EDGE_DIRECTIONS) : false;
}
