import { createHash } from "node:crypto";
import type { GameState } from "../game-state.js";
import type { Registry } from "../registry.js";
import type { EntityId, PlayerId } from "../ids.js";
import { canonicalize, projectState } from "./canonicalize.js";
import { reviveUnit, reviveCity, revivePlayer, reviveTile } from "./revive.js";
import { asNum, asBool, SerializationError, type Any } from "./validate.js";

export { SerializationError };

/**
 * Serializes state canonically: keys are sorted, so the same state always
 * produces byte-identical JSON regardless of the order fields were assigned.
 * Plain `JSON.stringify` would emit insertion order, and a revived entity
 * assigns its fields in constructor order — so a round-trip would change the
 * bytes without changing the state.
 */
export function serialize(state: GameState): string {
  return canonicalize(projectState(state));
}

export function deserialize(json: string, registry: Registry): GameState {
  const raw = JSON.parse(json) as Record<string, Any>;
  const entitiesRaw = raw.entities as Record<string, Record<string, Any>>;
  const mapRaw = raw.map as Record<string, Any>;
  const tilesRaw = mapRaw.tiles as Record<string, Any>;

  const units = Object.fromEntries(
    Object.entries(entitiesRaw.units ?? {}).map(([k, v]) => [k, reviveUnit(v, registry)]),
  );

  const cities = Object.fromEntries(
    Object.entries(entitiesRaw.cities ?? {}).map(([k, v]) => [k, reviveCity(v, registry)]),
  );

  const players = Object.fromEntries(
    Object.entries(raw.players as Record<string, Any>).map(([k, v]) => [
      k,
      revivePlayer(v, registry),
    ]),
  );

  const tiles = Object.fromEntries(
    Object.entries(tilesRaw).map(([k, v]) => [k, reviveTile(v, registry)]),
  );

  return {
    gameId: raw.gameId as EntityId,
    turn: asNum(raw.turn, "turn"),
    phase: raw.phase as GameState["phase"],
    activePlayerId: raw.activePlayerId as PlayerId | null,
    players,
    playerOrder: raw.playerOrder as PlayerId[],
    map: {
      width: asNum(mapRaw.width, "map.width"),
      height: asNum(mapRaw.height, "map.height"),
      isWraparoundX: asBool(mapRaw.isWraparoundX, "map.isWraparoundX"),
      tiles,
    },
    entities: { units, cities },
    rngState: raw.rngState as GameState["rngState"],
    rulesetRef: raw.rulesetRef as GameState["rulesetRef"],
    settings: raw.settings as GameState["settings"],
    nextEntitySeq: asNum(raw.nextEntitySeq, "nextEntitySeq"),
    winnerPlayerId: raw.winnerPlayerId as PlayerId | null,
    victoryType: raw.victoryType as GameState["victoryType"],
  };
}

export function stateHash(state: GameState): string {
  const canonical = canonicalize(projectState(state));
  return createHash("sha256").update(canonical).digest("hex");
}
