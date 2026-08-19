import type { GameState } from "./game-state.js";

/**
 * Asserts structural invariants on a GameState. Throws an Error naming
 * the violated invariant. Does NOT import vitest — safe for engine code.
 *
 * Covers:
 * - #6: every HexKey referenced by a unit's coord or city's centerTile exists in state.map.tiles
 * - #10: turn >= 0
 * - #11: rngState.drawCount >= 0
 * - every unit's and city's ownerId exists in state.players
 * - every id in playerOrder exists in state.players
 *
 * Out of scope (see DATA-MODEL.md §11):
 * - #3 (tile/unit bidirectional consistency) — Tile.occupantUnitIds not maintained yet
 * - #14 (every command produces >= 1 event) — belongs with the command that would violate it
 */
export function assertInvariants(state: GameState): void {
  for (const pid of state.playerOrder) {
    if (!state.players[pid]) {
      throw new Error(`Invariant: playerOrder contains unknown player ${pid}`);
    }
  }

  for (const [pid, player] of Object.entries(state.players)) {
    if (!player) continue;
    const playerId = pid as keyof typeof state.players;
    if (!state.playerOrder.includes(playerId)) {
      throw new Error(`Invariant: player ${playerId} exists but is not in playerOrder`);
    }
  }

  for (const [id, unit] of Object.entries(state.entities.units)) {
    if (!unit) continue;
    if (!state.players[unit.ownerId]) {
      throw new Error(`Invariant: unit ${id} has unknown ownerId ${unit.ownerId}`);
    }
    if (!state.map.tiles[unit.coord]) {
      throw new Error(`Invariant: unit ${id} references unknown tile ${unit.coord}`);
    }
  }

  for (const [id, city] of Object.entries(state.entities.cities)) {
    if (!city) continue;
    if (!state.players[city.ownerId]) {
      throw new Error(`Invariant: city ${id} has unknown ownerId ${city.ownerId}`);
    }
    if (!state.map.tiles[city.centerTile]) {
      throw new Error(`Invariant: city ${id} references unknown tile ${city.centerTile}`);
    }
  }

  if (state.turn < 0) {
    throw new Error(`Invariant: turn must be >= 0, got ${state.turn}`);
  }

  if (state.rngState.drawCount < 0) {
    throw new Error(`Invariant: rngState.drawCount must be >= 0, got ${state.rngState.drawCount}`);
  }
}
