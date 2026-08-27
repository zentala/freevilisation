import type { HexKey } from "../ids.js";
import type { GameState } from "../game-state.js";

/**
 * Finds a route as destination hexes, excluding the starting hex.
 *
 * The graph search is deliberately introduced in E10-W2. Keeping this
 * surface available now lets command and client code depend on one engine
 * contract while the search implementation is added independently.
 */
export function findPath(
  state: GameState,
  from: HexKey,
  to: HexKey,
): HexKey[] | null {
  if (!state.map.tiles[from] || !state.map.tiles[to]) return null;
  if (from === to) return [];
  return null;
}
