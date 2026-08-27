import type { GameMap, GameState } from "./game-state.js";
import type { HexKey, PlayerId } from "./ids.js";
import { fromHexKey } from "./hex/coords.js";
import { range } from "./hex/hex-math.js";

export const enum VisibilityState {
  Unexplored = 0,
  Explored = 1,
  Visible = 2,
}

export interface VisibilityGrid {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
}

export function createVisibilityGrid(map: GameMap): VisibilityGrid {
  return { width: map.width, height: map.height, cells: new Uint8Array(map.width * map.height) };
}

function index(map: GameMap, key: HexKey): number {
  const coord = fromHexKey(key);
  return coord.q + coord.r * map.width;
}

/** Reveals a unit's sight radius and demotes stale visible cells to explored. */
export function updateVisibility(
  map: GameMap,
  grid: VisibilityGrid,
  origin: HexKey,
  sightRadius: number,
): VisibilityGrid {
  if (grid.width !== map.width || grid.height !== map.height) {
    throw new Error("Visibility grid dimensions must match the map");
  }
  const cells = new Uint8Array(grid.cells);
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === VisibilityState.Visible) cells[i] = VisibilityState.Explored;
  }
  for (const coord of range(fromHexKey(origin), sightRadius)) {
    const key = `${coord.q},${coord.r}` as HexKey;
    if (map.tiles[key]) cells[index(map, key)] = VisibilityState.Visible;
  }
  return { ...grid, cells };
}

/** Updates a player's grid after a move when visibility is present in state. */
export function updatePlayerVisibility(
  state: GameState,
  playerId: PlayerId,
  origin: HexKey,
  sightRadius: number,
): GameState {
  const grid = state.visibility?.[playerId];
  if (!grid) return state;
  return {
    ...state,
    visibility: {
      ...state.visibility,
      [playerId]: updateVisibility(state.map, grid, origin, sightRadius),
    },
  };
}
