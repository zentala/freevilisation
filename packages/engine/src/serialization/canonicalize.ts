import type { GameState } from "../game-state.js";
import type { PlainEntity } from "./validate.js";

/**
 * Serializes any value with sorted object keys, so the same state always
 * produces byte-identical output regardless of field-assignment order.
 */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of value) obj[k] = v;
    return canonicalize(obj);
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const pairs = keys.map((k) => {
      const v = (value as Record<string, unknown>)[k];
      return JSON.stringify(k) + ":" + canonicalize(v);
    });
    return "{" + pairs.join(",") + "}";
  }
  return JSON.stringify(String(value));
}

function projectEntity(entity: { [key: string]: unknown }): PlainEntity {
  const plain: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(entity)) {
    if (v instanceof Map) {
      plain[k] = Object.fromEntries(v);
    } else {
      plain[k] = v;
    }
  }
  return plain as PlainEntity;
}

export function projectState(state: GameState): Record<string, unknown> {
  const plain: Record<string, unknown> = {
    gameId: state.gameId,
    turn: state.turn,
    phase: state.phase,
    activePlayerId: state.activePlayerId,
    playerOrder: state.playerOrder,
    map: {
      width: state.map.width,
      height: state.map.height,
      isWraparoundX: state.map.isWraparoundX,
      tiles: Object.fromEntries(
        Object.entries(state.map.tiles).map(([k, v]) => [
          k,
          projectEntity(v as unknown as { [key: string]: unknown }),
        ]),
      ),
    },
    entities: {
      units: Object.fromEntries(
        Object.entries(state.entities.units).map(([k, v]) => [
          k,
          projectEntity(v as unknown as { [key: string]: unknown }),
        ]),
      ),
      cities: Object.fromEntries(
        Object.entries(state.entities.cities).map(([k, v]) => [
          k,
          projectEntity(v as unknown as { [key: string]: unknown }),
        ]),
      ),
    },
    rngState: { ...state.rngState },
    rulesetRef: { ...state.rulesetRef },
    settings: { ...state.settings },
    nextEntitySeq: state.nextEntitySeq,
    winnerPlayerId: state.winnerPlayerId,
    victoryType: state.victoryType,
  };

  const players: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state.players)) {
    players[k] = projectEntity(v as unknown as { [key: string]: unknown });
  }
  plain.players = players;

  return plain;
}
